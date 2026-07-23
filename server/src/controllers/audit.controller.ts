import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export async function getAuditLogs(req: Request, res: Response) {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100, // most recent 100 — pagination comes next in this phase
  });
  return res.status(200).json({ logs });
}