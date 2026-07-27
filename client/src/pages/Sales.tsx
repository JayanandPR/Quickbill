import { useEffect, useState, useCallback } from 'react';
import { FileText, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import api from '../lib/api';
import { centsToDisplay } from '../lib/currency';
import { viewInvoice } from '../lib/invoice';
import type { Transaction } from '../types';
import Pagination from '../components/Pagination';

interface TransactionsResponse {
  transactions: Transaction[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function Sales() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 10 });

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<TransactionsResponse>('/transactions', {
        params: { page: String(page), limit: '10' },
      });
      setTransactions(res.data.transactions);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to load sales history', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  return (
    <div className="p-8 flex flex-col h-[calc(100vh-4rem)]">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-semibold text-gray-800">Sales</h1>
        <p className="text-sm text-gray-400 mt-1">All completed transactions</p>
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
                  <td colSpan={8} className="px-5 py-6 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-6 text-center text-gray-400">
                    No sales recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx: any) => (
                  <tr key={tx.id} className="border-b border-gray-50 last:border-0 align-top">
                    <td className="px-5 py-3 text-gray-800 font-medium">{tx.invoiceNumber}</td>
                    <td className="px-5 py-3 text-gray-700">
                      {tx.customer?.name ?? 'Walk-in'}
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