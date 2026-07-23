-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalLine" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debitCents" INTEGER NOT NULL DEFAULT 0,
    "creditCents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_reference_key" ON "JournalEntry"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_transactionId_key" ON "JournalEntry"("transactionId");

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
