import { useEffect, useState, useCallback } from 'react';
import { History, Receipt, AlertTriangle, CheckCircle2, Clock, Download, Search } from 'lucide-react';
import api from '../lib/api';
import { centsToDisplay, displayToCents } from '../lib/currency';
import type { Expense, ExpensesResponse, BillPaymentStatus, ExpenseAccountCode } from '../types';
import Pagination from '../components/Pagination';
import { downloadReport } from '../lib/report';

type View = 'record' | 'history';
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

const EXPENSE_CATEGORIES: { label: string; accountCode: ExpenseAccountCode }[] = [
  { label: 'Salaries & Wages', accountCode: '5200' },
  { label: 'Rent Expense', accountCode: '5300' },
  { label: 'Utilities Expense', accountCode: '5400' },
  { label: 'Marketing & Advertising', accountCode: '5600' },
  { label: 'Transport & Delivery', accountCode: '5700' },
  { label: 'Packaging & Supplies', accountCode: '5800' },
  { label: 'Equipment & Maintenance', accountCode: '5900' },
  { label: 'Bank & Payment Gateway Fees', accountCode: '6000' },
  { label: 'Insurance', accountCode: '6100' },
  { label: 'Miscellaneous Expense', accountCode: '5500' },
];

export default function Expenses() {
  const [view, setView] = useState<View>('record');

  return (
    <div className="p-8 h-[calc(100vh-4rem)]">
      {view === 'record' ? (
        <RecordExpenseView setView={setView} />
      ) : (
        <ExpenseHistoryView setView={setView} />
      )}
    </div>
  );
}

// ─────────────────────────────
// RECORD EXPENSE
// ─────────────────────────────
function RecordExpenseView({ setView }: { setView: (v: View) => void }) {
  
  const [accountCode, setAccountCode] = useState<ExpenseAccountCode>('5500'); // Miscellaneous default
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState<BillPaymentStatus>('UNPAID');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  

  async function handleSubmit() {
    setError('');
    setSuccess('');
    const amountCents = displayToCents(amount);
    if (amountCents <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const selectedCategory = EXPENSE_CATEGORIES.find((c) => c.accountCode === accountCode)!;

    setIsSubmitting(true);
    try {
      await api.post('/expenses', {
        category: selectedCategory.label,
        accountCode,
        amountCents,
        expenseDate,
        paymentStatus,
        dueDate: paymentStatus === 'UNPAID' ? dueDate || undefined : undefined,
        note: note || undefined,
      });
      setSuccess(`Recorded "${selectedCategory.label}" — ₹${amount}`);
      setAccountCode('5500');
      setAmount('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setPaymentStatus('UNPAID');
      setDueDate('');
      setNote('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Record Expense</h1>
        <button
          onClick={() => setView('history')}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50"
        >
          <History size={16} />
          Expense History
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={accountCode}
            onChange={(e) => setAccountCode(e.target.value as ExpenseAccountCode)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.accountCode} value={c.accountCode}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expense Date</label>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
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
        </div>

        {paymentStatus === 'UNPAID' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Note <span className="text-gray-400">(optional)</span>
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Priya's July salary, Office WiFi bill..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && (
          <p className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-md px-3 py-2">
            {success}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Recording...' : 'Record Expense'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────
// EXPENSE HISTORY
// ─────────────────────────────
function ExpenseHistoryView({ setView }: { setView: (v: View) => void }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 10 });

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange(dateFilter, customFrom, customTo);
      const res = await api.get<ExpensesResponse>('/expenses', {
        params: {
          page: String(page),
          limit: '10',
          ...(search && { search }),
          ...(from && { from }),
          ...(to && { to }),
        },
      });
      setExpenses(res.data.expenses);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to load expenses', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, dateFilter, customFrom, customTo]);

  useEffect(() => {
    setPage(1);
  }, [search, dateFilter, customFrom, customTo]);

  useEffect(() => {
    const timeout = setTimeout(loadExpenses, 300);
    return () => clearTimeout(timeout);
  }, [loadExpenses]);

  function handleDownload() {
    const { from, to } = getDateRange(dateFilter, customFrom, customTo);
    downloadReport(
      '/expenses/export',
      { ...(search && { search }), ...(from && { from }), ...(to && { to }) },
      `expense-report-${new Date().toISOString().split('T')[0]}.pdf`
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-4 shrink-0 gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-gray-800">Expense History</h1>
          <button
            onClick={() => setView('record')}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50"
          >
            <Receipt size={16} />
            Record Expense
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Category or note..."
              className="w-56 border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50"
          >
            <Download size={16} />
            Download PDF
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500 sticky top-0 bg-white">
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Account</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-gray-400">Loading...</td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-gray-400">No expenses found.</td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-gray-50 last:border-0 align-top">
                    <td className="px-5 py-3 text-gray-800 font-medium">
                      {exp.category}
                      {exp.note && <p className="text-xs text-gray-400 font-normal mt-0.5">{exp.note}</p>}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{exp.account?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(exp.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-gray-800 font-medium">
                      ₹{centsToDisplay(exp.amountCents)}
                    </td>
                    <td className="px-5 py-3">
                      <ExpenseStatusBadge expense={exp} />
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

function ExpenseStatusBadge({ expense }: { expense: Expense }) {
  if (expense.paymentStatus === 'PAID') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-700">
        <CheckCircle2 size={12} />
        Paid
      </span>
    );
  }

  if (!expense.dueDate) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
        <Clock size={12} />
        On Credit
      </span>
    );
  }

  const due = new Date(expense.dueDate);
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