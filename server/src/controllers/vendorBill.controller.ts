import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { buildVendorBillJournalLines, resolveAndValidateLines } from '../lib/ledger';
import { generateInvoicePdf } from '../lib/pdf/invoiceLayout';

const billItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitCostCents: z.number().int().nonnegative(),
});

const createBillSchema = z.object({
  vendorId: z.string().uuid(),
  vendorInvoiceNumber: z.string().min(1, 'Vendor invoice number is required'),
  items: z.array(billItemSchema).min(1, 'Bill must have at least one item'),
  taxCents: z.number().int().nonnegative().default(0),
  paymentStatus: z.enum(['PAID', 'UNPAID']).default('UNPAID'),
  purchaseDate: z.string().optional(), // ISO date string, defaults to today
  dueDate: z.string().optional(),      // only meaningful when UNPAID
});

async function generateBillNumber(): Promise<string> {
  const count = await prisma.vendorBill.count();
  return `BILL-${String(count + 1).padStart(6, '0')}`;
}

export async function createVendorBill(req: Request, res: Response) {
  const parsed = createBillSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { vendorId, vendorInvoiceNumber, items, taxCents, paymentStatus, purchaseDate, dueDate } = parsed.data;

  try {
    const bill = await prisma.$transaction(async (tx) => {
      const vendor = await tx.vendor.findFirst({ where: { id: vendorId, deletedAt: null } });
      if (!vendor) throw new Error('Vendor not found');

      const existingBill = await tx.vendorBill.findUnique({
        where: { vendorId_vendorInvoiceNumber: { vendorId, vendorInvoiceNumber } },
      });
      if (existingBill) {
        throw new Error(
          `Invoice "${vendorInvoiceNumber}" was already recorded for this vendor (Bill ${existingBill.billNumber})`
        );
      }

      const productIds = items.map((i) => i.productId);
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });
      if (products.length !== productIds.length) {
        throw new Error('One or more products were not found');
      }

      let subtotalCents = 0;
      const billItemsData = items.map((item) => {
        const product = products.find((p) => p.id === item.productId)!;
        const lineTotal = item.unitCostCents * item.quantity;
        subtotalCents += lineTotal;
        return {
          productId: product.id,
          nameSnapshot: product.name,
          quantity: item.quantity,
          unitCostCents: item.unitCostCents,
          lineTotalCents: lineTotal,
        };
      });

      const grandTotalCents = subtotalCents + taxCents;
      const billNumber = await generateBillNumber();

      const createdBill = await tx.vendorBill.create({
        data: {
          billNumber,
          vendorInvoiceNumber,
          vendorId,
          subtotalCents,
          taxCents,
          grandTotalCents,
          paymentStatus,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          dueDate: paymentStatus === 'UNPAID' && dueDate ? new Date(dueDate) : undefined,
          items: { create: billItemsData },
        },
        include: { items: true },
      });

      // Increment stock for each product purchased
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }

      // Build and validate the ledger entry
      const rawLines = buildVendorBillJournalLines({
        subtotalCents,
        taxCents,
        grandTotalCents,
        paymentStatus,
      });
      const resolvedLines = await resolveAndValidateLines(rawLines);

      const journalEntry = await tx.journalEntry.create({
        data: {
          reference: billNumber,
          description: `Vendor bill ${billNumber} — ${vendor.name}`,
          lines: { create: resolvedLines },
        },
      });

      return tx.vendorBill.update({
        where: { id: createdBill.id },
        data: { journalEntryId: journalEntry.id },
        include: { items: true, vendor: true },
      });
    });

    return res.status(201).json({ bill });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to create vendor bill' });
  }
}

export async function getVendorBills(req: Request, res: Response) {
  const { search, from, to, page = '1', limit = '10' } = req.query;
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));

  let toDate: Date | undefined;
  if (to) {
    toDate = new Date(String(to));
    toDate.setHours(23, 59, 59, 999);
  }

  const where = {
    ...(from || to
      ? {
          purchaseDate: {
            ...(from && { gte: new Date(String(from)) }),
            ...(toDate && { lte: toDate }),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { billNumber: { contains: String(search), mode: 'insensitive' as const } },
            { vendorInvoiceNumber: { contains: String(search), mode: 'insensitive' as const } },
            { vendor: { name: { contains: String(search), mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };

  const [bills, total] = await Promise.all([
    prisma.vendorBill.findMany({
      where,
      include: { items: true, vendor: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.vendorBill.count({ where }),
  ]);

  return res.status(200).json({
    bills,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  });
}

export async function getVendorBillInvoice(req: Request, res: Response) {
  const { id } = req.params as { id: string };

  const bill = await prisma.vendorBill.findUnique({
    where: { id },
    include: { items: true, vendor: true },
  });

  if (!bill) {
    return res.status(404).json({ message: 'Vendor bill not found' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${bill.billNumber}.pdf"`);

  generateInvoicePdf(
    {
      documentLabel: 'Purchase Invoice',
      invoiceNumber: bill.billNumber,
      secondaryReference: { label: 'Vendor Inv', value: bill.vendorInvoiceNumber },
      date: bill.purchaseDate,
      dueDate: bill.paymentStatus === 'UNPAID' ? bill.dueDate ?? undefined : undefined,
      partyLabel: 'Vendor',
      partyName: bill.vendor.name,
      items: bill.items.map((item) => ({
        name: item.nameSnapshot,
        quantity: item.quantity,
        unitPriceCents: item.unitCostCents,
        lineTotalCents: item.lineTotalCents,
      })),
      subtotalCents: bill.subtotalCents,
      taxCents: bill.taxCents,
      grandTotalCents: bill.grandTotalCents,
      paymentMethod: bill.paymentStatus,
      footerNote: `Payment Status: ${bill.paymentStatus}`,
    },
    res
  );
}