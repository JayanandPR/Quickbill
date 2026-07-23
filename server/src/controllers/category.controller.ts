import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
});

export async function createCategory(req: Request, res: Response) {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const existing = await prisma.category.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    return res.status(409).json({ message: 'A category with this name already exists' });
  }

  const category = await prisma.category.create({ data: parsed.data });
  return res.status(201).json({ category });
}

export async function getCategories(req: Request, res: Response) {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  });
  return res.status(200).json({ categories });
}

export async function updateCategory(req: Request, res: Response) {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { id } = req.params as { id: string };

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  const updated = await prisma.category.update({
    where: { id },
    data: parsed.data,
  });

  return res.status(200).json({ category: updated });
}

export async function deleteCategory(req: Request, res: Response) {
  const { id } = req.params as { id: string };

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    return res.status(409).json({
      message: `Cannot delete category — ${productCount} product(s) are still assigned to it`,
    });
  }

  await prisma.category.delete({ where: { id } });
  return res.status(200).json({ message: 'Category deleted' });
}