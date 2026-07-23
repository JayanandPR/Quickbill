import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export async function getJournalEntries(req: Request, res: Response) {
  const entries = await prisma.journalEntry.findMany({
    include: { lines: { include: { account: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return res.status(200).json({ entries });
}

export async function getAccounts(req: Request, res: Response) {
  const accounts = await prisma.account.findMany({ orderBy: { code: 'asc' } });
  return res.status(200).json({ accounts });
}