import { useEffect, useState } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, X } from 'lucide-react';
import api from '../lib/api';
import { centsToDisplay } from '../lib/currency';
import type { Product, Customer, CartItem, PaymentMethod } from '../types';
import { viewInvoice } from '../lib/invoice';

export default function Billing() {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState('');
  const [lastInvoice, setLastInvoice] = useState<{ id: string; invoiceNumber: string } | null>(null);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});

  // Search products (debounced)
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!search) {
        setProducts([]);
        return;
      }
      const res = await api.get<{ products: Product[] }>('/products', {
        params: { search },
      });
      setProducts(res.data.products.filter((p) => p.status === 'ACTIVE'));
    }, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  // Search customers (debounced)
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!customerSearch) {
        setCustomers([]);
        return;
      }
      const res = await api.get<{ customers: Customer[] }>('/customers', {
        params: { search: customerSearch },
      });
      setCustomers(res.data.customers);
    }, 250);
    return () => clearTimeout(timeout);
  }, [customerSearch]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
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

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
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

  // Totals — mirrors the backend calculation so the cashier sees the same numbers
  const subtotalCents = cart.reduce(
    (sum, item) => sum + item.product.sellPriceCents * item.quantity,
    0
  );
  const taxCents = cart.reduce((sum, item) => {
    const lineSubtotal = item.product.sellPriceCents * item.quantity;
    return sum + Math.round((lineSubtotal * item.product.taxRatePercent) / 100);
  }, 0);
  const discountCents = Math.round(parseFloat(discount || '0') * 100) || 0;
  const grandTotalCents = subtotalCents + taxCents - discountCents;

  async function handleCheckout() {
    setError('');
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }
    setIsCheckingOut(true);
    try {
      const res = await api.post('/transactions', {
        items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        discountCents,
        paymentMethod,
        customerId: selectedCustomer?.id,
      });
      setLastInvoice({ id: res.data.transaction.id, invoiceNumber: res.data.transaction.invoiceNumber });
      setCart([]);
      setDiscount('0');
      setSelectedCustomer(null);
      setCustomerSearch('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Checkout failed. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  }

  return (
    <div className="p-8 flex gap-6 h-[calc(100vh-4rem)]">
      {/* Left: product search + results */}
      <div className="flex-1 flex flex-col">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Billing</h1>

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
                disabled={product.stockQuantity === 0}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{product.name}</p>
                  <p className="text-xs text-gray-400">
                    {product.sku} • {product.stockQuantity} {product.unit} in stock
                  </p>
                </div>
                <p className="text-sm font-medium text-gray-700">
                  ₹{centsToDisplay(product.sellPriceCents)}
                </p>
              </button>
            ))}
          </div>
        )}

        {lastInvoice && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-4 py-3 mb-4 flex items-center justify-between">
            <span>Sale completed — Invoice {lastInvoice.invoiceNumber}</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => viewInvoice(`/transactions/${lastInvoice.id}/invoice`, `${lastInvoice.invoiceNumber}.pdf`)}
                className="text-green-700 font-medium hover:underline"
              >
                View Invoice
              </button>
              <button onClick={() => setLastInvoice(null)} className="text-green-500 hover:text-green-700">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-300">
              <ShoppingCart size={40} />
              <p className="text-sm mt-2 text-gray-400">Search and add products to the cart</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500 sticky top-0 bg-white">
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.product.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 text-gray-800">{item.product.name}</td>
                    <td className="px-4 py-3 text-gray-500">
                      ₹{centsToDisplay(item.product.sellPriceCents)}
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
                      ₹{centsToDisplay(item.product.sellPriceCents * item.quantity)}
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

      {/* Right: checkout panel */}
      <div className="w-80 shrink-0 bg-white rounded-lg border border-gray-200 p-5 flex flex-col">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Checkout</h2>

        {/* Customer picker */}
        <div className="mb-4 relative">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Customer <span className="text-gray-300">(optional)</span>
          </label>
          {selectedCustomer ? (
            <div className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2 text-sm">
              <span className="text-gray-800">{selectedCustomer.name}</span>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-300 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <input
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Search or leave blank for walk-in"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showCustomerDropdown && customers.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md mt-1 shadow-sm max-h-40 overflow-y-auto">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setShowCustomerDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      {c.name} {c.phone && <span className="text-gray-400">• {c.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Payment method */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
          <div className="grid grid-cols-3 gap-2">
            {(['CASH', 'CARD', 'UPI'] as PaymentMethod[]).map((method) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`text-xs font-medium py-2 rounded-md border ${
                  paymentMethod === method
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Discount */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Discount (₹)</label>
          <input
            type="number"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
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
          <div className="flex justify-between text-gray-500">
            <span>Discount</span>
            <span>-₹{centsToDisplay(discountCents)}</span>
          </div>
          <div className="flex justify-between text-gray-800 font-semibold text-base pt-2 border-t border-gray-100">
            <span>Total</span>
            <span>₹{centsToDisplay(Math.max(0, grandTotalCents))}</span>
          </div>
        </div>

        {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

        <button
          onClick={handleCheckout}
          disabled={isCheckingOut || cart.length === 0}
          className="mt-4 w-full bg-blue-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isCheckingOut ? 'Processing...' : 'Complete Sale'}
        </button>
      </div>
    </div>
  );
}