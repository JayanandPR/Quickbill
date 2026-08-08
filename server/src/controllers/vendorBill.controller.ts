import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { buildVendorBillJournalLines, resolveAndValidateLines } from '../lib/ledger';
import { generateInvoicePdf } from '../lib/pdf/invoiceLayout';
import { getOrCreateBusinessSettings, fetchLogoBuffer } from '../lib/settings';
import { generateListReportPdf } from '../lib/pdf/listReportLayout';
import { getBusinessBranding } from '../lib/businessBranding';

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

  const settings = await getOrCreateBusinessSettings();
  const logoBuffer = await fetchLogoBuffer(settings.logoUrl);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${bill.billNumber}.pdf"`);

  generateInvoicePdf(
    {
      businessName: settings.businessName,
      businessAddress: settings.address ?? undefined,
      businessPhone: settings.phone ?? undefined,
      logoBuffer,
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

export async function getVendorBillsExport(req: Request, res: Response) {
  const { search, from, to } = req.query;

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

  const bills = await prisma.vendorBill.findMany({
    where,
    include: { vendor: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const branding = await getBusinessBranding();

  const filterParts: string[] = [];
  if (from) filterParts.push(`From: ${new Date(String(from)).toLocaleDateString('en-IN')}`);
  if (to) filterParts.push(`To: ${new Date(String(to)).toLocaleDateString('en-IN')}`);
  if (search) filterParts.push(`Search: "${search}"`);

  const totalCents = bills.reduce((sum, b) => sum + b.grandTotalCents, 0);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="purchase-report.pdf"');

  generateListReportPdf(
    {
      ...branding,
      title: 'Purchase Report',
      filterSummary: filterParts.join('   •   ') || 'All Time',
      columns: [
        { key: 'billNumber', label: 'Bill No.', width: 85 },
        { key: 'vendorInvoice', label: 'Vendor Invoice', width: 90 },
        { key: 'vendor', label: 'Vendor', width: 110 },
        { key: 'date', label: 'Date', width: 70 },
        { key: 'total', label: 'Total', width: 65, align: 'right' },
        { key: 'status', label: 'Status', width: 55 },
      ],
      rows: bills.map((b) => ({
        billNumber: b.billNumber,
        vendorInvoice: b.vendorInvoiceNumber,
        vendor: b.vendor.name,
        date: b.purchaseDate.toLocaleDateString('en-IN'),
        total: `Rs. ${(b.grandTotalCents / 100).toFixed(2)}`,
        status: b.paymentStatus,
      })),
      totalLabel: 'Grand Total',
      totalValue: `Rs. ${(totalCents / 100).toFixed(2)}`,
    },
    res
  );
}