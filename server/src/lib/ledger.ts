import { prisma } from './prisma';

interface JournalLineInput {
  accountCode: string;
  debitCents: number;
  creditCents: number;
}

interface SaleForLedger {
  subtotalCents: number; // pre-tax revenue
  taxCents: number;
  discountCents: number;
  grandTotalCents: number; // what the customer actually paid
}

interface VendorBillForLedger {
  subtotalCents: number;
  taxCents: number;
  grandTotalCents: number;
  paymentStatus: 'PAID' | 'UNPAID';
}

interface ExpenseForLedger {
  accountCode: string;
  amountCents: number;
  paymentStatus: 'PAID' | 'UNPAID';
}

/**
 * Builds the balanced debit/credit lines for a single retail sale.
 *
 * A typical cash sale of ₹100 + ₹18 tax, with no discount:
 *   Debit  Cash                 118
 *   Credit Sales Revenue              100
 *   Credit Tax Payable                 18
 *
 * If a discount was given, an extra pair of lines routes it through
 * a Discounts Given expense account, so revenue stays "clean" (gross)
 * and the discount is visible separately in reports.
 */
export function buildSaleJournalLines(sale: SaleForLedger): JournalLineInput[] {
  const lines: JournalLineInput[] = [];

  // Money actually received goes into Cash
  lines.push({ accountCode: '1000', debitCents: sale.grandTotalCents, creditCents: 0 });

  // Full (pre-discount) revenue is credited to Sales Revenue
  lines.push({ accountCode: '4000', debitCents: 0, creditCents: sale.subtotalCents });

  // Tax collected is owed to the government — a liability, not revenue
  lines.push({ accountCode: '2100', debitCents: 0, creditCents: sale.taxCents });

  // If a discount was given, debit it as an expense to balance the entry
  if (sale.discountCents > 0) {
    lines.push({ accountCode: '5100', debitCents: sale.discountCents, creditCents: 0 });
  }

  return lines;
}

/**
 * Validates that an entry balances, converts account codes to real account IDs,
 * and returns data ready for Prisma's nested `create`.
 * Throws if debits !== credits — the caller should be inside a $transaction
 * so the whole operation rolls back.
 */
export async function resolveAndValidateLines(lines: JournalLineInput[]) {
  const totalDebits = lines.reduce((sum, l) => sum + l.debitCents, 0);
  const totalCredits = lines.reduce((sum, l) => sum + l.creditCents, 0);

  if (totalDebits !== totalCredits) {
    throw new Error(
      `Unbalanced journal entry: debits (${totalDebits}) do not equal credits (${totalCredits})`
    );
  }

  const codes = lines.map((l) => l.accountCode);
  const accounts = await prisma.account.findMany({ where: { code: { in: codes } } });

  if (accounts.length !== new Set(codes).size) {
    throw new Error('One or more ledger accounts were not found — check that seeding ran');
  }

  return lines.map((line) => {
    const account = accounts.find((a) => a.code === line.accountCode)!;
    return {
      accountId: account.id,
      debitCents: line.debitCents,
      creditCents: line.creditCents,
    };
  });
}

/**
 * Builds the balanced debit/credit lines for a vendor purchase.
 *
 * Buying ₹1000 of stock, ₹180 tax, paid immediately in cash:
 *   Debit  Inventory            1000
 *   Debit  Tax Payable            180   (input tax reduces what you owe, simplified here)
 *   Credit Cash                       1180
 *
 * If bought on credit (unpaid), Cash is replaced with Accounts Payable:
 *   Debit  Inventory            1000
 *   Debit  Tax Payable            180
 *   Credit Accounts Payable            1180
 */
export function buildVendorBillJournalLines(bill: VendorBillForLedger): JournalLineInput[] {
  const lines: JournalLineInput[] = [];

  // Stock purchased increases the Inventory asset
  lines.push({ accountCode: '1200', debitCents: bill.subtotalCents, creditCents: 0 });

  if (bill.taxCents > 0) {
    lines.push({ accountCode: '2100', debitCents: bill.taxCents, creditCents: 0 });
  }

  if (bill.paymentStatus === 'PAID') {
    lines.push({ accountCode: '1000', debitCents: 0, creditCents: bill.grandTotalCents });
  } else {
    lines.push({ accountCode: '2000', debitCents: 0, creditCents: bill.grandTotalCents });
  }

  return lines;
}

/**
 * Builds the balanced debit/credit lines for a standalone business expense
 * (salaries, rent, utilities, etc.) — not tied to inventory, unlike vendor bills.
 *
 * Paid immediately:
 *   Debit  [Expense Account]     amount
 *   Credit Cash                        amount
 *
 * On credit (owed):
 *   Debit  [Expense Account]     amount
 *   Credit Accounts Payable            amount
 */
export function buildExpenseJournalLines(expense: ExpenseForLedger): JournalLineInput[] {
  const lines: JournalLineInput[] = [];

  lines.push({ accountCode: expense.accountCode, debitCents: expense.amountCents, creditCents: 0 });

  if (expense.paymentStatus === 'PAID') {
    lines.push({ accountCode: '1000', debitCents: 0, creditCents: expense.amountCents });
  } else {
    lines.push({ accountCode: '2000', debitCents: 0, creditCents: expense.amountCents });
  }

  return lines;
}