export type Role = 'ADMIN' | 'CASHIER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  category?: Category;
  costPriceCents: number;
  sellPriceCents: number;
  taxRatePercent: number;
  unit: string;
  stockQuantity: number;
  reorderPoint: number;
  hsnCode?: string;
  status: ProductStatus;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  nameSnapshot: string;
  skuSnapshot: string;
  quantity: number;
  unitPriceCents: number;
  taxRatePercent: number;
  lineTotalCents: number;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'UPI';

export interface Transaction {
  id: string;
  invoiceNumber: string;
  items: SaleItem[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  grandTotalCents: number;
  paymentMethod: PaymentMethod;
  status: 'COMPLETED' | 'REFUNDED' | 'VOIDED';
  customerId?: string;
  createdAt: string;
}

// Cart item — client-side only, before checkout
export interface CartItem {
  product: Product;
  quantity: number;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  totalDebits: number;
  totalCredits: number;
}

export interface TrialBalanceResponse {
  rows: TrialBalanceRow[];
  grandTotalDebits: number;
  grandTotalCredits: number;
  isBalanced: boolean;
}

export interface PLRow {
  accountCode: string;
  accountName: string;
  amountCents: number;
}

export interface ProfitAndLossResponse {
  revenue: PLRow[];
  expenses: PLRow[];
  totalRevenueCents: number;
  totalExpenseCents: number;
  netProfitCents: number;
}

export interface BalanceSheetResponse {
  assets: PLRow[];
  liabilities: PLRow[];
  equity: PLRow[];
  totalAssetsCents: number;
  totalLiabilitiesCents: number;
  totalEquityCents: number;
  isBalanced: boolean;
}

export interface SalesReportRow {
  period: string;
  salesCents: number;
  taxCents: number;
  count: number;
}

export interface VendorBillItem {
  id: string;
  productId: string;
  nameSnapshot: string;
  quantity: number;
  unitCostCents: number;
  lineTotalCents: number;
}

export type BillPaymentStatus = 'PAID' | 'UNPAID';

export interface VendorBill {
  id: string;
  billNumber: string;
  vendorInvoiceNumber: string;
  vendorId: string;
  vendor?: { name: string };
  items: VendorBillItem[];
  subtotalCents: number;
  taxCents: number;
  grandTotalCents: number;
  paymentStatus: BillPaymentStatus;
  purchaseDate: string;
  dueDate?: string;
  createdAt: string;
}

// Cart item for the purchase screen — client-side only
export interface PurchaseCartItem {
  product: Product;
  quantity: number;
  unitCostCents: number; // editable — may differ from product's stored cost price
}

export interface VendorBillsResponse {
  bills: VendorBill[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type ExpenseAccountCode = '5200' | '5300' | '5400' | '5500';

export interface Expense {
  id: string;
  category: string;
  accountId: string;
  account?: { code: string; name: string };
  amountCents: number;
  expenseDate: string;
  paymentStatus: BillPaymentStatus;
  dueDate?: string;
  note?: string;
  createdAt: string;
}

export interface ExpensesResponse {
  expenses: Expense[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}