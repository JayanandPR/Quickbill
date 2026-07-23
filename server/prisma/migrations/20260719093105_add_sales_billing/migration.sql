-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'UPI');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('COMPLETED', 'REFUNDED', 'VOIDED');

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL,
    "grandTotalCents" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "skuSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "taxRatePercent" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_invoiceNumber_key" ON "Transaction"("invoiceNumber");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
