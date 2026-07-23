import { prisma } from './prisma';

interface LogActionParams {
  userId: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: string;
  details?: string;
}

export async function logAction(params: LogActionParams) {
  try {
    await prisma.auditLog.create({ data: params });
  } catch (err) {
    // Audit logging must never break the actual request —
    // if it fails, just log to console and move on.
    console.error('Failed to write audit log:', err);
  }
}