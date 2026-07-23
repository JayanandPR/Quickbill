import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logAction } from '../lib/audit';

const productSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  categoryId: z.string().uuid('Invalid category ID'),
  costPriceCents: z.number().int().nonnegative('Cost price cannot be negative'),
  sellPriceCents: z.number().int().nonnegative('Selling price cannot be negative'),
  taxRatePercent: z.number().int().min(0).max(100).default(0),
  unit: z.string().default('pcs'),
  stockQuantity: z.number().int().nonnegative().default(0),
  reorderPoint: z.number().int().nonnegative().default(5),
  hsnCode: z.string().optional(),
});

const updateProductSchema = productSchema.partial(); // all fields optional for PATCH-style updates

export async function createProduct(req: Request, res: Response) {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const existingSku = await prisma.product.findUnique({ where: { sku: parsed.data.sku } });
  if (existingSku) {
    return res.status(409).json({ message: 'A product with this SKU already exists' });
  }

  const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  const product = await prisma.product.create({ data: parsed.data });
  return res.status(201).json({ product });
}

export async function getProducts(req: Request, res: Response) {
  const { search, categoryId, status, page = '1', limit = '10' } = req.query;

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const where = {
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: String(search), mode: 'insensitive' as const } },
        { sku: { contains: String(search), mode: 'insensitive' as const } },
      ],
    }),
    ...(categoryId && { categoryId: String(categoryId) }),
    ...(status && { status: String(status) as any }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.product.count({ where }),
  ]);

  return res.status(200).json({
    products,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}

export async function getProductById(req: Request, res: Response) {
  const { id } = req.params as { id: string };

  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: { category: true },
  });

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  return res.status(200).json({ product });
}

export async function updateProduct(req: Request, res: Response) {
  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { id } = req.params as { id: string };

  const product = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const updated = await prisma.product.update({
    where: { id },
    data: parsed.data,
  });

  return res.status(200).json({ product: updated });
}

// Soft delete — sets deletedAt instead of removing the row
export async function deleteProduct(req: Request, res: Response) {
  const { id } = req.params as { id: string };

  const product = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  await prisma.product.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'DISCONTINUED' },
  });

  await logAction({
    userId: req.user!.userId,
    userName: (await prisma.user.findUnique({ where: { id: req.user!.userId } }))?.name ?? 'Unknown',
    action: 'DELETE',
    entityType: 'Product',
    entityId: product.id,
    details: `Deleted product "${product.name}" (SKU: ${product.sku})`,
  });

  return res.status(200).json({ message: 'Product deleted (soft delete)' });
}

// Low-stock alert endpoint
export async function getLowStockProducts(req: Request, res: Response) {
  const products = await prisma.$queryRaw`
    SELECT * FROM "Product"
    WHERE "deletedAt" IS NULL
      AND "stockQuantity" <= "reorderPoint"
    ORDER BY "stockQuantity" ASC
  `;

  return res.status(200).json({ products });
}