import { useEffect, useState } from 'react';
import { Search, Plus, Minus, Trash2, PackagePlus, X } from 'lucide-react';
import api from '../lib/api';
import { centsToDisplay, displayToCents } from '../lib/currency';
import type { Product, Vendor, PurchaseCartItem, BillPaymentStatus } from '../types';

export default function Purchases() {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<PurchaseCartItem[]>([]);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  const [taxAmount, setTaxAmount] = useState('0');
  const [paymentStatus, setPaymentStatus] = useState<BillPaymentStatus>('UNPAID');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastBillNumber, setLastBillNumber] = useState<string | null>(null);

  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');

  // Search products (debounced)
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

  // Search vendors (debounced)
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
      // Default the purchase cost to the product's stored cost price — editable per line
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
    if (cart.length === 0) {
      setError('Add at least one product to the purchase');
      return;
    }
    if (!vendorInvoiceNumber.trim()) {
      setError('Please enter the vendor\'s invoice number');
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
      setLastBillNumber(res.data.bill.billNumber);
      setCart([]);
      setSelectedVendor(null);
      setVendorSearch('');
      setTaxAmount('0');
      setPaymentStatus('UNPAID');
      setVendorInvoiceNumber('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record purchase. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-8 flex gap-6 h-[calc(100vh-4rem)]">
      {/* Left: product search + cart */}
      <div className="flex-1 flex flex-col">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Record Purchase</h1>

        <div className="relative mb-4">
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
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-50 mb-4 max-h-72 overflow-y-auto">
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

        {lastBillNumber && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-4 py-3 mb-4 flex items-center justify-between">
            <span>Purchase recorded — Bill {lastBillNumber}</span>
            <button onClick={() => setLastBillNumber(null)} className="text-green-500 hover:text-green-700">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-y-auto">
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
                        <span className="w-6 text-center">{item.quantity}</span>
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
      <div className="w-80 shrink-0 bg-white rounded-lg border border-gray-200 p-5 flex flex-col">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Purchase Details</h2>

        {/* Vendor picker */}
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

        {/* Vendor invoice number */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Vendor Invoice Number
          </label>
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

        {/* Purchase date */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Purchase Date</label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Payment status */}
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

        {/* Tax */}
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

        {/* Totals */}
        <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
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

        {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || cart.length === 0}
          className="mt-4 w-full bg-blue-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Recording...' : 'Record Purchase'}
        </button>
      </div>
    </div>
  );
}