import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, PackagePlus, X, History, ShoppingCart, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import api from '../lib/api';
import { centsToDisplay, displayToCents } from '../lib/currency';
import type { Product, Vendor, PurchaseCartItem, BillPaymentStatus, VendorBill, VendorBillsResponse } from '../types';
import Pagination from '../components/Pagination';
import { viewInvoice } from '../lib/invoice';

type View = 'record' | 'history';

export default function Purchases() {
  const [view, setView] = useState<View>('record');

  return (
    <div className="p-8 h-[calc(100vh-4rem)]">
      {view === 'record' ? (
        <RecordPurchaseView setView={setView} />
      ) : (
        <PurchaseHistoryView setView={setView} />
      )}
    </div>
  );
}

// ─────────────────────────────
// RECORD PURCHASE
// ─────────────────────────────
function RecordPurchaseView({ setView }: { setView: (v: View) => void }) {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<PurchaseCartItem[]>([]);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [taxAmount, setTaxAmount] = useState('0');
  const [paymentStatus, setPaymentStatus] = useState<BillPaymentStatus>('UNPAID');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastBill, setLastBill] = useState<{ id: string; billNumber: string } | null>(null);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!search) {
        setProducts([]);
        return;
      }
      const res = await api.get<{ products: Product[] }>('/products', { params: { search } });
      setProducts(res.data.products);
    }, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!vendorSearch) {
        setVendors([]);
        return;
      }
      const res = await api.get<{ vendors: Vendor[] }>('/vendors', { params: { search: vendorSearch } });
      setVendors(res.data.vendors);
    }, 250);
    return () => clearTimeout(timeout);
  }, [vendorSearch]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, unitCostCents: product.costPriceCents }];
    });
    setSearch('');
    setProducts([]);
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function commitQuantity(productId: string) {
  const draft = quantityDrafts[productId];
  setQuantityDrafts((prev) => {
    const copy = { ...prev };
    delete copy[productId];
    return copy;
  });
  if (draft === undefined) return;

  const parsed = parseInt(draft, 10);
  const clamped = isNaN(parsed) || parsed < 1 ? 1 : parsed;

  setCart((prev) =>
    prev.map((item) => (item.product.id === productId ? { ...item, quantity: clamped } : item))
  );
}

  function updateUnitCost(productId: string, displayValue: string) {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, unitCostCents: displayToCents(displayValue) }
          : item
      )
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }

  const subtotalCents = cart.reduce((sum, item) => sum + item.unitCostCents * item.quantity, 0);
  const taxCents = displayToCents(taxAmount) || 0;
  const grandTotalCents = subtotalCents + taxCents;

  async function handleSubmit() {
    setError('');
    if (!selectedVendor) {
      setError('Please select a vendor');
      return;
    }
    if (!vendorInvoiceNumber.trim()) {
      setError("Please enter the vendor's invoice number");
      return;
    }
    if (cart.length === 0) {
      setError('Add at least one product to the purchase');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post('/vendor-bills', {
        vendorId: selectedVendor.id,
        vendorInvoiceNumber,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitCostCents: item.unitCostCents,
        })),
        taxCents,
        paymentStatus,
        purchaseDate,
        dueDate: paymentStatus === 'UNPAID' ? dueDate || undefined : undefined,
      });
      setLastBill({ id: res.data.bill.id, billNumber: res.data.bill.billNumber });
      setCart([]);
      setSelectedVendor(null);
      setVendorSearch('');
      setVendorInvoiceNumber('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setTaxAmount('0');
      setPaymentStatus('UNPAID');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record purchase. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Left: product search + cart */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-4 mb-4 shrink-0">
          <h1 className="text-2xl font-semibold text-gray-800">Record Purchase</h1>
          <button
            onClick={() => setView('history')}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50"
          >
            <History size={16} />
            Purchase History
          </button>
        </div>

        <div className="relative mb-4 shrink-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product by name or SKU..."
            className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {products.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-50 mb-4 max-h-72 overflow-y-auto shrink-0">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{product.name}</p>
                  <p className="text-xs text-gray-400">
                    {product.sku} • Current stock: {product.stockQuantity} {product.unit}
                  </p>
                </div>
                <p className="text-sm font-medium text-gray-700">
                  Cost ₹{centsToDisplay(product.costPriceCents)}
                </p>
              </button>
            ))}
          </div>
        )}

        {lastBill && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-4 py-3 mb-4 flex items-center justify-between shrink-0">
            <span>Purchase recorded — Bill {lastBill.billNumber}</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => viewInvoice(`/vendor-bills/${lastBill.id}/invoice`, `${lastBill.billNumber}.pdf`)}
                className="text-green-700 font-medium hover:underline"
              >
                View Invoice
              </button>
              <button onClick={() => setLastBill(null)} className="text-green-500 hover:text-green-700">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-y-auto min-h-0">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-300">
              <PackagePlus size={40} />
              <p className="text-sm mt-2 text-gray-400">Search and add products to restock</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500 sticky top-0 bg-white">
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Unit Cost (₹)</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.product.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 text-gray-800">{item.product.name}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        value={centsToDisplay(item.unitCostCents)}
                        onChange={(e) => updateUnitCost(item.product.id, e.target.value)}
                        className="w-24 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded hover:bg-gray-50"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={quantityDrafts[item.product.id] ?? String(item.quantity)}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*$/.test(val)) {
                              setQuantityDrafts((prev) => ({ ...prev, [item.product.id]: val }));
                            }
                          }}
                          onBlur={() => commitQuantity(item.product.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          }}
                          className="w-10 text-center border border-gray-200 rounded px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded hover:bg-gray-50"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      ₹{centsToDisplay(item.unitCostCents * item.quantity)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-gray-300 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right: purchase summary panel */}
      <div className="w-80 shrink-0 bg-white rounded-lg border border-gray-200 p-5 flex flex-col overflow-y-auto">
        <h2 className="text-sm font-semibold text-gray-800 mb-3 shrink-0">Purchase Details</h2>

        <div className="mb-4 relative">
          <label className="block text-xs font-medium text-gray-500 mb-1">Vendor</label>
          {selectedVendor ? (
            <div className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2 text-sm">
              <span className="text-gray-800">{selectedVendor.name}</span>
              <button
                onClick={() => setSelectedVendor(null)}
                className="text-gray-300 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <input
                value={vendorSearch}
                onChange={(e) => {
                  setVendorSearch(e.target.value);
                  setShowVendorDropdown(true);
                }}
                onFocus={() => setShowVendorDropdown(true)}
                placeholder="Search vendor..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showVendorDropdown && vendors.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md mt-1 shadow-sm max-h-40 overflow-y-auto">
                  {vendors.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedVendor(v);
                        setShowVendorDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Vendor Invoice Number</label>
          <input
            value={vendorInvoiceNumber}
            onChange={(e) => setVendorInvoiceNumber(e.target.value)}
            placeholder="e.g. INV-45872"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            From the vendor's own invoice — prevents recording the same bill twice
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Purchase Date</label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Payment Status</label>
          <div className="grid grid-cols-2 gap-2">
            {(['UNPAID', 'PAID'] as BillPaymentStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setPaymentStatus(status)}
                className={`text-xs font-medium py-2 rounded-md border ${
                  paymentStatus === status
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {status === 'PAID' ? 'Paid Now' : 'On Credit'}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {paymentStatus === 'PAID'
              ? 'Recorded as a cash payment'
              : 'Recorded as Accounts Payable (owed to vendor)'}
          </p>
        </div>

        {paymentStatus === 'UNPAID' && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Tax Amount (₹)</label>
          <input
            type="number"
            step="0.01"
            value={taxAmount}
            onChange={(e) => setTaxAmount(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm shrink-0">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>₹{centsToDisplay(subtotalCents)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Tax</span>
            <span>₹{centsToDisplay(taxCents)}</span>
          </div>
          <div className="flex justify-between text-gray-800 font-semibold text-base pt-2 border-t border-gray-100">
            <span>Total</span>
            <span>₹{centsToDisplay(grandTotalCents)}</span>
          </div>
        </div>

        {error && <p className="text-red-500 text-xs mt-3 shrink-0">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || cart.length === 0}
          className="mt-4 w-full bg-blue-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shrink-0"
        >
          {isSubmitting ? 'Recording...' : 'Record Purchase'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────
// PURCHASE HISTORY
// ─────────────────────────────
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

function getDateRange(filter: DateFilter, customFrom: string, customTo: string) {
  const today = new Date();
  const toStr = today.toISOString().split('T')[0];

  if (filter === 'today') return { from: toStr, to: toStr };
  if (filter === 'week') {
    const day = today.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - diffToMonday);
    return { from: monday.toISOString().split('T')[0], to: toStr };
  }
  if (filter === 'month') {
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: firstOfMonth.toISOString().split('T')[0], to: toStr };
  }
  if (filter === 'custom') return { from: customFrom || undefined, to: customTo || undefined };
  return { from: undefined, to: undefined };
}

function PurchaseHistoryView({ setView }: { setView: (v: View) => void }) {
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 10 });

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange(dateFilter, customFrom, customTo);
      const res = await api.get<VendorBillsResponse>('/vendor-bills', {
        params: {
          page: String(page),
          limit: '10',
          ...(search && { search }),
          ...(from && { from }),
          ...(to && { to }),
        },
      });
      setBills(res.data.bills);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to load purchase history', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, dateFilter, customFrom, customTo]);

  useEffect(() => {
    setPage(1);
  }, [search, dateFilter, customFrom, customTo]);

  useEffect(() => {
    const timeout = setTimeout(loadBills, 300);
    return () => clearTimeout(timeout);
  }, [loadBills]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-4 shrink-0 gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-gray-800">Purchase History</h1>
          <button
            onClick={() => setView('record')}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50"
          >
            <ShoppingCart size={16} />
            Record Purchase
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Bill no, vendor invoice, or vendor..."
              className="w-64 border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateFilter === 'custom' && (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500 sticky top-0 bg-white">
                <th className="px-5 py-3 font-medium">Bill No.</th>
                <th className="px-5 py-3 font-medium">Vendor Invoice</th>
                <th className="px-5 py-3 font-medium">Vendor</th>
                <th className="px-5 py-3 font-medium">Purchase Date</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-gray-400">
                    No purchases found.
                  </td>
                </tr>
              ) : (
                bills.map((bill) => (
                  <tr key={bill.id} className="border-b border-gray-50 last:border-0 align-top">
                    <td className="px-5 py-3 text-gray-800 font-medium">{bill.billNumber}</td>
                    <td className="px-5 py-3 text-gray-500">{bill.vendorInvoiceNumber}</td>
                    <td className="px-5 py-3 text-gray-700">{bill.vendor?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(bill.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-gray-800 font-medium">
                      ₹{centsToDisplay(bill.grandTotalCents)}
                    </td>
                    <td className="px-5 py-3">
                      <PaymentStatusBadge bill={bill} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────
// Payment status + due-date alert badge
// ─────────────────────────────
function PaymentStatusBadge({ bill }: { bill: VendorBill }) {
  if (bill.paymentStatus === 'PAID') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-700">
        <CheckCircle2 size={12} />
        Paid
      </span>
    );
  }

  // UNPAID — check due date to decide the alert color
  if (!bill.dueDate) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
        <Clock size={12} />
        On Credit
      </span>
    );
  }

  const due = new Date(bill.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const daysUntilDue = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (daysUntilDue < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-red-50 text-red-600">
        <AlertTriangle size={12} />
        Overdue by {Math.abs(daysUntilDue)}d
      </span>
    );
  }

  if (daysUntilDue <= 3) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-yellow-50 text-yellow-700">
        <Clock size={12} />
        Due in {daysUntilDue}d
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
      <Clock size={12} />
      Due {due.toLocaleDateString()}
    </span>
  );
}