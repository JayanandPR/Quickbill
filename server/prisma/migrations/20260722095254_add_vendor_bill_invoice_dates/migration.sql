/*
  Warnings:

  - A unique constraint covering the columns `[vendorId,vendorInvoiceNumber]` on the table `VendorBill` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `vendorInvoiceNumber` to the `VendorBill` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: add new columns, vendorInvoiceNumber nullable for now
ALTER TABLE "VendorBill" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "vendorInvoiceNumber" TEXT;

-- Backfill existing rows with their own billNumber, which is already unique,
-- so the new unique constraint below can never collide
UPDATE "VendorBill" SET "vendorInvoiceNumber" = "billNumber" WHERE "vendorInvoiceNumber" IS NULL;

-- Now that every row has a value, enforce NOT NULL
ALTER TABLE "VendorBill" ALTER COLUMN "vendorInvoiceNumber" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "VendorBill_vendorId_vendorInvoiceNumber_key" ON "VendorBill"("vendorId", "vendorInvoiceNumber");