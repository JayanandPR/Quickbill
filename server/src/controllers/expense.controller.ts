import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { buildExpenseJournalLines, resolveAndValidateLines } from '../lib/ledger';

const EXPENSE_ACCOUNT_CODES = ['5200', '5300', '5400', '5500'] as const;

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
  const { page = '1', limit = '10' } = req.query;
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      include: { account: true },
      orderBy: { expenseDate: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.expense.count(),
  ]);

  return res.status(200).json({
    expenses,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  });
}