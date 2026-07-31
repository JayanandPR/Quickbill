import { useEffect, useState, useCallback } from 'react';
import { FileText, CheckCircle2, XCircle, RotateCcw, Search } from 'lucide-react';
import api from '../lib/api';
import { centsToDisplay } from '../lib/currency';
import { viewInvoice } from '../lib/invoice';
import Pagination from '../components/Pagination';

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

function getDateRange(filter: DateFilter, customFrom: string, customTo: string) {
  const today = new Date();
  const toStr = today.toISOString().split('T')[0];

  if (filter === 'today') {
    return { from: toStr, to: toStr };
  }
  if (filter === 'week') {
    const day = today.getDay(); // 0 = Sunday
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - diffToMonday);
    return { from: monday.toISOString().split('T')[0], to: toStr };
  }
  if (filter === 'month') {
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: firstOfMonth.toISOString().split('T')[0], to: toStr };
  }
  if (filter === 'custom') {
    return { from: customFrom || undefined, to: customTo || undefined };
  }
  return { from: undefined, to: undefined };
}

export default function Sales() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 10 });

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange(dateFilter, customFrom, customTo);
      const res = await api.get('/transactions', {
        params: {
          page: String(page),
          limit: '10',
          ...(search && { search }),
          ...(from && { from }),
          ...(to && { to }),
        },
      });
      setTransactions(res.data.transactions);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to load sales history', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, dateFilter, customFrom, customTo]);

  // Debounce search + date filter changes, reset to page 1
  useEffect(() => {
    setPage(1);
  }, [search, dateFilter, customFrom, customTo]);

  useEffect(() => {
    const timeout = setTimeout(loadTransactions, 300);
    return () => clearTimeout(timeout);
  }, [loadTransactions]);

  return (
    <div className="p-8 flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-start justify-between mb-6 shrink-0 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Sales</h1>
          <p className="text-sm text-gray-400 mt-1">All completed transactions</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Invoice, customer, or phone..."
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
                <th className="px-5 py-3 font-medium">Invoice No.</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Cashier</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Payment</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-6 text-center text-gray-400">Loading...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-6 text-center text-gray-400">No sales found.</td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-50 last:border-0 align-top">
                    <td className="px-5 py-3 text-gray-800 font-medium">{tx.invoiceNumber}</td>
                    <td className="px-5 py-3 text-gray-700">
                      {tx.customer?.name ?? 'Walk-in'}
                      {tx.customer?.phone && (
                        <p className="text-xs text-gray-400 font-normal">{tx.customer.phone}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{tx.cashier?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{tx.paymentMethod}</td>
                    <td className="px-5 py-3 text-gray-800 font-medium">
                      ₹{centsToDisplay(tx.grandTotalCents)}
                    </td>
                    <td className="px-5 py-3">
                      <TransactionStatusBadge status={tx.status} />
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => viewInvoice(`/transactions/${tx.id}/invoice`, `${tx.invoiceNumber}.pdf`)}
                        className="text-gray-400 hover:text-blue-600"
                        title="View Invoice"
                      >
                        <FileText size={16} />
                      </button>
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

function TransactionStatusBadge({ status }: { status: string }) {
  if (status === 'COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-700">
        <CheckCircle2 size={12} />
        Completed
      </span>
    );
  }
  if (status === 'REFUNDED') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-yellow-50 text-yellow-700">
        <RotateCcw size={12} />
        Refunded
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-red-50 text-red-600">
      <XCircle size={12} />
      Voided
    </span>
  );
}