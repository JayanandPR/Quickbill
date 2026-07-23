import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// ─────────────────────────────
// TRIAL BALANCE
// Lists every account with its total debits and credits.
// A correct ledger always nets to zero: total debits === total credits
// across the WHOLE table, even though individual accounts don't balance
// to zero themselves.
// ─────────────────────────────
export async function getTrialBalance(req: Request, res: Response) {
  const accounts = await prisma.account.findMany({
    orderBy: { code: 'asc' },
    include: {
      journalLines: {
        select: { debitCents: true, creditCents: true },
      },
    },
  });

  const rows = accounts.map((account) => {
    const totalDebits = account.journalLines.reduce((sum, l) => sum + l.debitCents, 0);
    const totalCredits = account.journalLines.reduce((sum, l) => sum + l.creditCents, 0);
    return {
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      totalDebits,
      totalCredits,
    };
  });

  const grandTotalDebits = rows.reduce((sum, r) => sum + r.totalDebits, 0);
  const grandTotalCredits = rows.reduce((sum, r) => sum + r.totalCredits, 0);

  return res.status(200).json({
    rows,
    grandTotalDebits,
    grandTotalCredits,
    isBalanced: grandTotalDebits === grandTotalCredits,
  });
}

// ─────────────────────────────
// PROFIT & LOSS STATEMENT
// P&L = Revenue − Expenses, over a date range.
// Revenue accounts grow via credits; Expense accounts grow via debits —
// that's why the "net" calculation for each type looks reversed.
// ─────────────────────────────
export async function getProfitAndLoss(req: Request, res: Response) {
  const { from, to } = req.query;

  const dateFilter =
    from || to
      ? {
          journalEntry: {
            createdAt: {
              ...(from && { gte: new Date(String(from)) }),
              ...(to && { lte: new Date(String(to)) }),
            },
          },
        }
      : {};

  const revenueAccounts = await prisma.account.findMany({
    where: { type: 'REVENUE' },
    include: { journalLines: { where: dateFilter } },
  });

  const expenseAccounts = await prisma.account.findMany({
    where: { type: 'EXPENSE' },
    include: { journalLines: { where: dateFilter } },
  });

  const revenueRows = revenueAccounts.map((account) => {
    const credits = account.journalLines.reduce((sum, l) => sum + l.creditCents, 0);
    const debits = account.journalLines.reduce((sum, l) => sum + l.debitCents, 0);
    return { accountCode: account.code, accountName: account.name, amountCents: credits - debits };
  });

  const expenseRows = expenseAccounts.map((account) => {
    const debits = account.journalLines.reduce((sum, l) => sum + l.debitCents, 0);
    const credits = account.journalLines.reduce((sum, l) => sum + l.creditCents, 0);
    return { accountCode: account.code, accountName: account.name, amountCents: debits - credits };
  });

  const totalRevenueCents = revenueRows.reduce((sum, r) => sum + r.amountCents, 0);
  const totalExpenseCents = expenseRows.reduce((sum, r) => sum + r.amountCents, 0);
  const netProfitCents = totalRevenueCents - totalExpenseCents;

  return res.status(200).json({
    revenue: revenueRows,
    expenses: expenseRows,
    totalRevenueCents,
    totalExpenseCents,
    netProfitCents,
  });
}

// ─────────────────────────────
// BALANCE SHEET
// As of a point in time: Assets = Liabilities + Equity.
// Asset accounts grow via debits; Liability/Equity accounts grow via credits.
// Retained earnings (net profit so far) is folded into Equity so the
// sheet actually balances — this is standard practice.
// ─────────────────────────────
export async function getBalanceSheet(req: Request, res: Response) {
  const { asOf } = req.query;

  const dateFilter = asOf
    ? { journalEntry: { createdAt: { lte: new Date(String(asOf)) } } }
    : {};

  const [assetAccounts, liabilityAccounts, equityAccounts, revenueAccounts, expenseAccounts] =
    await Promise.all([
      prisma.account.findMany({ where: { type: 'ASSET' }, include: { journalLines: { where: dateFilter } } }),
      prisma.account.findMany({ where: { type: 'LIABILITY' }, include: { journalLines: { where: dateFilter } } }),
      prisma.account.findMany({ where: { type: 'EQUITY' }, include: { journalLines: { where: dateFilter } } }),
      prisma.account.findMany({ where: { type: 'REVENUE' }, include: { journalLines: { where: dateFilter } } }),
      prisma.account.findMany({ where: { type: 'EXPENSE' }, include: { journalLines: { where: dateFilter } } }),
    ]);

  const netBalance = (lines: { debitCents: number; creditCents: number }[], growsOnDebit: boolean) => {
    const debits = lines.reduce((sum, l) => sum + l.debitCents, 0);
    const credits = lines.reduce((sum, l) => sum + l.creditCents, 0);
    return growsOnDebit ? debits - credits : credits - debits;
  };

  const assetRows = assetAccounts.map((a) => ({
    accountCode: a.code,
    accountName: a.name,
    amountCents: netBalance(a.journalLines, true),
  }));

  const liabilityRows = liabilityAccounts.map((a) => ({
    accountCode: a.code,
    accountName: a.name,
    amountCents: netBalance(a.journalLines, false),
  }));

  const equityRows = equityAccounts.map((a) => ({
    accountCode: a.code,
    accountName: a.name,
    amountCents: netBalance(a.journalLines, false),
  }));

  // Retained earnings = net profit accumulated to date, folded into Equity
  const totalRevenueCents = revenueAccounts.reduce(
    (sum, a) => sum + netBalance(a.journalLines, false),
    0
  );
  const totalExpenseCents = expenseAccounts.reduce(
    (sum, a) => sum + netBalance(a.journalLines, true),
    0
  );
  const retainedEarningsCents = totalRevenueCents - totalExpenseCents;

  const totalAssetsCents = assetRows.reduce((sum, r) => sum + r.amountCents, 0);
  const totalLiabilitiesCents = liabilityRows.reduce((sum, r) => sum + r.amountCents, 0);
  const totalEquityCents =
    equityRows.reduce((sum, r) => sum + r.amountCents, 0) + retainedEarningsCents;

  return res.status(200).json({
    assets: assetRows,
    liabilities: liabilityRows,
    equity: [...equityRows, { accountCode: '3900', accountName: 'Retained Earnings', amountCents: retainedEarningsCents }],
    totalAssetsCents,
    totalLiabilitiesCents,
    totalEquityCents,
    isBalanced: totalAssetsCents === totalLiabilitiesCents + totalEquityCents,
  });
}

// ─────────────────────────────
// SALES REPORTS (daily/weekly/monthly)
// Groups completed transactions by day and sums revenue/tax.
// Grouping by week/month is done in JS from the daily buckets,
// since Prisma's groupBy can't truncate dates on its own.
// ─────────────────────────────
export async function getSalesReport(req: Request, res: Response) {
  const { from, to, groupBy = 'day' } = req.query;

  const transactions = await prisma.transaction.findMany({
    where: {
      status: 'COMPLETED',
      ...(from || to
        ? {
            createdAt: {
              ...(from && { gte: new Date(String(from)) }),
              ...(to && { lte: new Date(String(to)) }),
            },
          }
        : {}),
    },
    select: { createdAt: true, subtotalCents: true, taxCents: true, grandTotalCents: true },
    orderBy: { createdAt: 'asc' },
  });

  function bucketKey(date: Date): string {
    if (groupBy === 'month') {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    if (groupBy === 'week') {
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const weekNumber = Math.ceil(
        ((date.getTime() - firstDayOfYear.getTime()) / 86400000 + firstDayOfYear.getDay() + 1) / 7
      );
      return `${date.getFullYear()}-W${weekNumber}`;
    }
    return date.toISOString().split('T')[0]; // day
  }

  const buckets: Record<string, { salesCents: number; taxCents: number; count: number }> = {};

  for (const tx of transactions) {
    const key = bucketKey(tx.createdAt);
    if (!buckets[key]) buckets[key] = { salesCents: 0, taxCents: 0, count: 0 };
    buckets[key].salesCents += tx.grandTotalCents;
    buckets[key].taxCents += tx.taxCents;
    buckets[key].count += 1;
  }

  const report = Object.entries(buckets).map(([period, data]) => ({ period, ...data }));

  return res.status(200).json({ report });
}