-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED');

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "categoryId" TEXT NOT NULL,
    "costPriceCents" INTEGER NOT NULL,
    "sellPriceCents" INTEGER NOT NULL,
    "taxRatePercent" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER NOT NULL DEFAULT 5,
    "hsnCode" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
