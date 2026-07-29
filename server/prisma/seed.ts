import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const accounts = [
    { code: '1000', name: 'Cash', type: 'ASSET' as const },
    { code: '1100', name: 'Accounts Receivable', type: 'ASSET' as const },
    { code: '1200', name: 'Inventory', type: 'ASSET' as const },
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' as const },
    { code: '2100', name: 'Tax Payable', type: 'LIABILITY' as const },
    { code: '3000', name: "Owner's Equity", type: 'EQUITY' as const },
    { code: '4000', name: 'Sales Revenue', type: 'REVENUE' as const },
    { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' as const },
    { code: '5100', name: 'Discounts Given', type: 'EXPENSE' as const },
    { code: '5200', name: 'Salaries & Wages', type: 'EXPENSE' as const },
    { code: '5300', name: 'Rent Expense', type: 'EXPENSE' as const },
    { code: '5400', name: 'Utilities Expense', type: 'EXPENSE' as const },
    { code: '5500', name: 'Miscellaneous Expense', type: 'EXPENSE' as const },
  ];

  for (const account of accounts) {
    await prisma.account.upsert({
      where: { code: account.code },
      update: {},
      create: account,
    });
  }

  console.log('Chart of Accounts seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });