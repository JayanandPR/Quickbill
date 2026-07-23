-- CreateEnum
CREATE TYPE "BillPaymentStatus" AS ENUM ('PAID', 'UNPAID');

-- CreateTable
CREATE TABLE "VendorBill" (
    "id" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "grandTotalCents" INTEGER NOT NULL,
    "paymentStatus" "BillPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBillItem" (
    "id" TEXT NOT NULL,
    "vendorBillId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCostCents" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,

    CONSTRAINT "VendorBillItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorBill_billNumber_key" ON "VendorBill"("billNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBill_journalEntryId_key" ON "VendorBill"("journalEntryId");

-- AddForeignKey
ALTER TABLE "VendorBill" ADD CONSTRAINT "VendorBill_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBill" ADD CONSTRAINT "VendorBill_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillItem" ADD CONSTRAINT "VendorBillItem_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "VendorBill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillItem" ADD CONSTRAINT "VendorBillItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
