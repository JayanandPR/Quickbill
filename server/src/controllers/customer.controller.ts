import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
});

export async function createCustomer(req: Request, res: Response) {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const customer = await prisma.customer.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email || undefined,
      phone: parsed.data.phone || undefined,
    },
  });

  return res.status(201).json({ customer });
}

export async function getCustomers(req: Request, res: Response) {
  const { search, page = '1', limit = '10' } = req.query;

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const where = {
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: String(search), mode: 'insensitive' as const } },
        { email: { contains: String(search), mode: 'insensitive' as const } },
        { phone: { contains: String(search), mode: 'insensitive' as const } },
      ],
    }),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({ where, orderBy: { name: 'asc' }, skip, take: limitNum }),
    prisma.customer.count({ where }),
  ]);

  return res.status(200).json({
    customers,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}

export async function updateCustomer(req: Request, res: Response) {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { id } = req.params as { id: string };

  const customer = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
  if (!customer) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email || undefined,
      phone: parsed.data.phone || undefined,
    },
  });

  return res.status(200).json({ customer: updated });
}

export async function deleteCustomer(req: Request, res: Response) {
  const { id } = req.params as { id: string };

  const customer = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
  if (!customer) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  return res.status(200).json({ message: 'Customer deleted' });
}