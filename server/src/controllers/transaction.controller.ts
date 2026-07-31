import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { buildSaleJournalLines, resolveAndValidateLines } from '../lib/ledger';
import { generateInvoicePdf } from '../lib/pdf/invoiceLayout';

const saleItemInputSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
});

const createSaleSchema = z.object({
  items: z.array(saleItemInputSchema).min(1, 'Cart cannot be empty'),
  discountCents: z.number().int().nonnegative().default(0),
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI']),
  customerId: z.string().uuid().optional(),
});

async function generateInvoiceNumber(): Promise<string> {
  const count = await prisma.transaction.count();
  const nextNumber = count + 1;
  return `INV-${String(nextNumber).padStart(6, '0')}`;
}

export async function createSale(req: Request, res: Response) {
  const parsed = createSaleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { items, discountCents, paymentMethod, customerId } = parsed.data;
  const cashierId = req.user!.userId;

  try {
    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Fetch all products involved, and lock in their current price/stock
      const productIds = items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, deletedAt: null },
      });

      if (products.length !== productIds.length) {
        throw new Error('One or more products were not found');
      }

      // 2. Validate stock and build line items
      let subtotalCents = 0;
      let taxCents = 0;
      const saleItemsData = items.map((item) => {
        const product = products.find((p) => p.id === item.productId)!;

        if (product.stockQuantity < item.quantity) {
          throw new Error(
            `Insufficient stock for "${product.name}" — only ${product.stockQuantity} ${product.unit} left`
          );
        }

        const lineSubtotal = product.sellPriceCents * item.quantity;
        const lineTax = Math.round((lineSubtotal * product.taxRatePercent) / 100);
        const lineTotal = lineSubtotal + lineTax;

        subtotalCents += lineSubtotal;
        taxCents += lineTax;

        return {
          productId: product.id,
          nameSnapshot: product.name,
          skuSnapshot: product.sku,
          quantity: item.quantity,
          unitPriceCents: product.sellPriceCents,
          taxRatePercent: product.taxRatePercent,
          lineTotalCents: lineTotal,
        };
      });

      const grandTotalCents = subtotalCents + taxCents - discountCents;

      if (grandTotalCents < 0) {
        throw new Error('Discount cannot exceed the order total');
      }

      // 3. Create the transaction + sale items together
      const invoiceNumber = await generateInvoiceNumber();

      const createdTransaction = await tx.transaction.create({
        data: {
          invoiceNumber,
          cashierId,
          customerId,
          subtotalCents,
          discountCents,
          taxCents,
          grandTotalCents,
          paymentMethod,
          items: { create: saleItemsData },
        },
        include: { items: true },
      });

      // 4. Decrement stock for each product — happens in the SAME transaction,
      // so if anything above failed, this never runs either
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }

      // 5. Build and validate the double-entry ledger lines for this sale —
      // done ONCE per sale, outside the stock-decrement loop, since a sale
      // only ever produces one journal entry regardless of item count
      const rawLines = buildSaleJournalLines({
        subtotalCents,
        taxCents,
        discountCents,
        grandTotalCents,
      });
      const resolvedLines = await resolveAndValidateLines(rawLines);

      // 6. Create the journal entry — if this throws (unbalanced), everything
      // above (sale + stock decrement) rolls back too, since we're still
      // inside the same $transaction
      await tx.journalEntry.create({
        data: {
          reference: invoiceNumber,
          description: `Sale ${invoiceNumber}`,
          transactionId: createdTransaction.id,
          lines: { create: resolvedLines },
        },
      });

      return createdTransaction;
    });

    return res.status(201).json({ transaction });
  } catch (err: any) {
    // Errors thrown inside $transaction cause the whole thing to roll back —
    // nothing is saved and no stock is decremented.
    return res.status(400).json({ message: err.message || 'Failed to complete sale' });
  }
}

export async function getTransactions(req: Request, res: Response) {
  const { from, to, search, page = '1', limit = '10' } = req.query;

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  let toDate: Date | undefined;
  if (to) {
    toDate = new Date(String(to));
    toDate.setHours(23, 59, 59, 999);
  }

  const where = {
    ...(from || to
      ? {
          createdAt: {
            ...(from && { gte: new Date(String(from)) }),
            ...(toDate && { lte: toDate }),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { invoiceNumber: { contains: String(search), mode: 'insensitive' as const } },
            { customer: { name: { contains: String(search), mode: 'insensitive' as const } } },
            { customer: { phone: { contains: String(search), mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        items: true,
        cashier: { select: { name: true } },
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.transaction.count({ where }),
  ]);

  return res.status(200).json({
    transactions,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}

export async function getTransactionById(req: Request, res: Response) {
  const { id } = req.params as { id: string };

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: { items: true, cashier: { select: { name: true } } },
  });

  if (!transaction) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  return res.status(200).json({ transaction });
}

export async function getTransactionInvoice(req: Request, res: Response) {
  const { id } = req.params as { id: string };

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      items: true,
      cashier: { select: { name: true } },
      customer: { select: { name: true } },
    },
  });

  if (!transaction) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${transaction.invoiceNumber}.pdf"`);

  generateInvoicePdf(
    {
      documentTitle: 'SALES INVOICE',
      invoiceNumber: transaction.invoiceNumber,
      date: transaction.createdAt,
      partyLabel: 'Billed To',
      partyName: transaction.customer?.name ?? 'Walk-in Customer',
      items: transaction.items.map((item) => ({
        name: item.nameSnapshot,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: item.lineTotalCents,
      })),
      subtotalCents: transaction.subtotalCents,
      taxCents: transaction.taxCents,
      discountCents: transaction.discountCents,
      grandTotalCents: transaction.grandTotalCents,
      footerNote: `Served by ${transaction.cashier.name} • Payment: ${transaction.paymentMethod}`,
    },
    res
  );
}