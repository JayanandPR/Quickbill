import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { buildExpenseJournalLines, resolveAndValidateLines } from '../lib/ledger';
import { generateListReportPdf } from '../lib/pdf/listReportLayout';
import { getBusinessBranding } from '../lib/businessBranding';

const EXPENSE_ACCOUNT_CODES = [
  '5200', '5300', '5400', '5500', '5600', '5700', '5800', '5900', '6000', '6100',
] as const;

const createExpenseSchema = z.object({
  category: z.string().min(2, 'Category is required'),
  accountCode: z.enum(EXPENSE_ACCOUNT_CODES).default('5500'), // defaults to Miscellaneous
  amountCents: z.number().int().positive('Amount must be greater than 0'),
  expenseDate: z.string().optional(),
  paymentStatus: z.enum(['PAID', 'UNPAID']).default('UNPAID'),
  dueDate: z.string().optional(),
  note: z.string().optional(),
});

export async function createExpense(req: Request, res: Response) {
  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { category, accountCode, amountCents, expenseDate, paymentStatus, dueDate, note } =
    parsed.data;

  try {
    const expense = await prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({ where: { code: accountCode } });
      if (!account) throw new Error('Expense account not found — check that seeding ran');

      const rawLines = buildExpenseJournalLines({ accountCode, amountCents, paymentStatus });
      const resolvedLines = await resolveAndValidateLines(rawLines);

      const createdExpense = await tx.expense.create({
        data: {
          category,
          accountId: account.id,
          amountCents,
          expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
          paymentStatus,
          dueDate: paymentStatus === 'UNPAID' && dueDate ? new Date(dueDate) : undefined,
          note,
        },
      });

      const journalEntry = await tx.journalEntry.create({
        data: {
          reference: `EXP-${createdExpense.id.slice(0, 8)}`,
          description: `Expense — ${category}`,
          lines: { create: resolvedLines },
        },
      });

      return tx.expense.update({
        where: { id: createdExpense.id },
        data: { journalEntryId: journalEntry.id },
        include: { account: true },
      });
    });

    return res.status(201).json({ expense });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to record expense' });
  }
}

export async function getExpenses(req: Request, res: Response) {
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
          expenseDate: {
            ...(from && { gte: new Date(String(from)) }),
            ...(toDate && { lte: toDate }),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { category: { contains: String(search), mode: 'insensitive' as const } },
            { note: { contains: String(search), mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { account: true },
      orderBy: { expenseDate: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.expense.count({ where }),
  ]);

  return res.status(200).json({
    expenses,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  });
}

export async function getExpensesExport(req: Request, res: Response) {
  const { search, from, to } = req.query;

  let toDate: Date | undefined;
  if (to) {
    toDate = new Date(String(to));
    toDate.setHours(23, 59, 59, 999);
  }

  const where = {
    ...(from || to
      ? {
          expenseDate: {
            ...(from && { gte: new Date(String(from)) }),
            ...(toDate && { lte: toDate }),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { category: { contains: String(search), mode: 'insensitive' as const } },
            { note: { contains: String(search), mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const expenses = await prisma.expense.findMany({
    where,
    include: { account: true },
    orderBy: { expenseDate: 'desc' },
  });

  const branding = await getBusinessBranding();

  const filterParts: string[] = [];
  if (from) filterParts.push(`From: ${new Date(String(from)).toLocaleDateString('en-IN')}`);
  if (to) filterParts.push(`To: ${new Date(String(to)).toLocaleDateString('en-IN')}`);
  if (search) filterParts.push(`Search: "${search}"`);

  const totalCents = expenses.reduce((sum, e) => sum + e.amountCents, 0);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="expense-report.pdf"');

  generateListReportPdf(
    {
      ...branding,
      title: 'Expense Report',
      filterSummary: filterParts.join('   •   ') || 'All Time',
      columns: [
        { key: 'category', label: 'Category', width: 150 },
        { key: 'account', label: 'Account', width: 130 },
        { key: 'date', label: 'Date', width: 80 },
        { key: 'amount', label: 'Amount', width: 75, align: 'right' },
        { key: 'status', label: 'Status', width: 80 },
      ],
      rows: expenses.map((e) => ({
        category: e.category,
        account: e.account.name,
        date: e.expenseDate.toLocaleDateString('en-IN'),
        amount: `Rs. ${(e.amountCents / 100).toFixed(2)}`,
        status: e.paymentStatus,
      })),
      totalLabel: 'Grand Total',
      totalValue: `Rs. ${(totalCents / 100).toFixed(2)}`,
    },
    res
  );
}