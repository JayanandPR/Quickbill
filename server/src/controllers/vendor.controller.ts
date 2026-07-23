import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const vendorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
});

export async function createVendor(req: Request, res: Response) {
  const parsed = vendorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const vendor = await prisma.vendor.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email || undefined,
      phone: parsed.data.phone || undefined,
    },
  });

  return res.status(201).json({ vendor });
}

export async function getVendors(req: Request, res: Response) {
  const { search } = req.query;

  const vendors = await prisma.vendor.findMany({
    where: {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: String(search), mode: 'insensitive' } },
          { email: { contains: String(search), mode: 'insensitive' } },
          { phone: { contains: String(search), mode: 'insensitive' } },
        ],
      }),
    },
    orderBy: { name: 'asc' },
  });

  return res.status(200).json({ vendors });
}

export async function updateVendor(req: Request, res: Response) {
  const parsed = vendorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { id } = req.params as { id: string };

  const vendor = await prisma.vendor.findFirst({ where: { id, deletedAt: null } });
  if (!vendor) {
    return res.status(404).json({ message: 'Vendor not found' });
  }

  const updated = await prisma.vendor.update({
    where: { id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email || undefined,
      phone: parsed.data.phone || undefined,
    },
  });

  return res.status(200).json({ vendor: updated });
}

export async function deleteVendor(req: Request, res: Response) {
  const { id } = req.params as { id: string };

  const vendor = await prisma.vendor.findFirst({ where: { id, deletedAt: null } });
  if (!vendor) {
    return res.status(404).json({ message: 'Vendor not found' });
  }

  await prisma.vendor.update({ where: { id }, data: { deletedAt: new Date() } });
  return res.status(200).json({ message: 'Vendor deleted' });
}