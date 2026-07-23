import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import api from '../lib/api';
import { centsToDisplay } from '../lib/currency';
import type {
  TrialBalanceResponse,
  ProfitAndLossResponse,
  BalanceSheetResponse,
  SalesReportRow,
} from '../types';

type Tab = 'trial-balance' | 'pnl' | 'balance-sheet' | 'sales';

const tabs: { id: Tab; label: string }[] = [
  { id: 'trial-balance', label: 'Trial Balance' },
  { id: 'pnl', label: 'Profit & Loss' },
  { id: 'balance-sheet', label: 'Balance Sheet' },
  { id: 'sales', label: 'Sales Report' },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState<Tab>('trial-balance');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-800 mb-1">Financial Reports</h1>
      <p className="text-sm text-gray-400 mb-6">
        Live figures derived from your ledger and sales records
      </p>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'trial-balance' && <TrialBalanceTab />}
      {activeTab === 'pnl' && <ProfitAndLossTab />}
      {activeTab === 'balance-sheet' && <BalanceSheetTab />}
      {activeTab === 'sales' && <SalesReportTab />}
    </div>
  );
}

// ─────────────────────────────
// Trial Balance
// ─────────────────────────────
function TrialBalanceTab() {
  const [data, setData] = useState<TrialBalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<TrialBalanceResponse>('/reports/trial-balance').then((res) => {
      setData(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-gray-400 text-sm">Loading...</p>;
  if (!data) return null;

  return (
    <div>
      <BalanceBadge isBalanced={data.isBalanced} />

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="px-5 py-3 font-medium">Code</th>
              <th className="px-5 py-3 font-medium">Account</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium text-right">Debits</th>
              <th className="px-5 py-3 font-medium text-right">Credits</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.accountCode} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-3 text-gray-400">{row.accountCode}</td>
                <td className="px-5 py-3 text-gray-800 font-medium">{row.accountName}</td>
                <td className="px-5 py-3 text-gray-400">{row.accountType}</td>
                <td className="px-5 py-3 text-right text-gray-700">
                  ₹{centsToDisplay(row.totalDebits)}
                </td>
                <td className="px-5 py-3 text-right text-gray-700">
                  ₹{centsToDisplay(row.totalCredits)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 font-semibold text-gray-800">
              <td colSpan={3} className="px-5 py-3">Total</td>
              <td className="px-5 py-3 text-right">₹{centsToDisplay(data.grandTotalDebits)}</td>
              <td className="px-5 py-3 text-right">₹{centsToDisplay(data.grandTotalCredits)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────
// Profit & Loss
// ─────────────────────────────
function ProfitAndLossTab() {
  const [data, setData] = useState<ProfitAndLossResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ProfitAndLossResponse>('/reports/profit-and-loss').then((res) => {
      setData(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-gray-400 text-sm">Loading...</p>;
  if (!data) return null;

  const isProfit = data.netProfitCents >= 0;

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Revenue
        </h3>
        {data.revenue.map((row) => (
          <div key={row.accountCode} className="flex justify-between py-1.5 text-sm">
            <span className="text-gray-600">{row.accountName}</span>
            <span className="text-gray-800">₹{centsToDisplay(row.amountCents)}</span>
          </div>
        ))}
        <div className="flex justify-between py-2 mt-1 border-t border-gray-100 font-medium text-sm">
          <span className="text-gray-700">Total Revenue</span>
          <span className="text-gray-900">₹{centsToDisplay(data.totalRevenueCents)}</span>
        </div>

        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-6">
          Expenses
        </h3>
        {data.expenses.length === 0 ? (
          <p className="text-sm text-gray-400">No expenses recorded</p>
        ) : (
          data.expenses.map((row) => (
            <div key={row.accountCode} className="flex justify-between py-1.5 text-sm">
              <span className="text-gray-600">{row.accountName}</span>
              <span className="text-gray-800">₹{centsToDisplay(row.amountCents)}</span>
            </div>
          ))
        )}
        <div className="flex justify-between py-2 mt-1 border-t border-gray-100 font-medium text-sm">
          <span className="text-gray-700">Total Expenses</span>
          <span className="text-gray-900">₹{centsToDisplay(data.totalExpenseCents)}</span>
        </div>

        <div
          className={`flex justify-between py-3 mt-4 border-t-2 border-gray-200 font-semibold text-base ${
            isProfit ? 'text-green-700' : 'text-red-600'
          }`}
        >
          <span>Net {isProfit ? 'Profit' : 'Loss'}</span>
          <span>₹{centsToDisplay(Math.abs(data.netProfitCents))}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────
// Balance Sheet
// ─────────────────────────────
function BalanceSheetTab() {
  const [data, setData] = useState<BalanceSheetResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<BalanceSheetResponse>('/reports/balance-sheet').then((res) => {
      setData(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-gray-400 text-sm">Loading...</p>;
  if (!data) return null;

  return (
    <div>
      <BalanceBadge isBalanced={data.isBalanced} />

      <div className="grid grid-cols-2 gap-4 mt-4 max-w-3xl">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Assets
          </h3>
          {data.assets.map((row) => (
            <div key={row.accountCode} className="flex justify-between py-1.5 text-sm">
              <span className="text-gray-600">{row.accountName}</span>
              <span className="text-gray-800">₹{centsToDisplay(row.amountCents)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 mt-1 border-t border-gray-100 font-semibold text-sm">
            <span className="text-gray-700">Total Assets</span>
            <span className="text-gray-900">₹{centsToDisplay(data.totalAssetsCents)}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Liabilities
          </h3>
          {data.liabilities.length === 0 ? (
            <p className="text-sm text-gray-400">None recorded</p>
          ) : (
            data.liabilities.map((row) => (
              <div key={row.accountCode} className="flex justify-between py-1.5 text-sm">
                <span className="text-gray-600">{row.accountName}</span>
                <span className="text-gray-800">₹{centsToDisplay(row.amountCents)}</span>
              </div>
            ))
          )}
          <div className="flex justify-between py-2 mt-1 border-t border-gray-100 font-semibold text-sm">
            <span className="text-gray-700">Total Liabilities</span>
            <span className="text-gray-900">₹{centsToDisplay(data.totalLiabilitiesCents)}</span>
          </div>

          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-6">
            Equity
          </h3>
          {data.equity.map((row) => (
            <div key={row.accountCode} className="flex justify-between py-1.5 text-sm">
              <span className="text-gray-600">{row.accountName}</span>
              <span className="text-gray-800">₹{centsToDisplay(row.amountCents)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 mt-1 border-t border-gray-100 font-semibold text-sm">
            <span className="text-gray-700">Total Equity</span>
            <span className="text-gray-900">₹{centsToDisplay(data.totalEquityCents)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────
// Sales Report
// ─────────────────────────────
function SalesReportTab() {
  const [data, setData] = useState<SalesReportRow[]>([]);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ report: SalesReportRow[] }>('/reports/sales', { params: { groupBy } })
      .then((res) => {
        setData(res.data.report);
        setLoading(false);
      });
  }, [groupBy]);

  const maxSales = Math.max(...data.map((r) => r.salesCents), 1);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['day', 'week', 'month'] as const).map((g) => (
          <button
            key={g}
            onClick={() => setGroupBy(g)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
              groupBy === g
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            By {g.charAt(0).toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : data.length === 0 ? (
        <p className="text-gray-400 text-sm">No sales recorded yet.</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {/* Simple bar chart, no external chart library needed */}
          <div className="space-y-3 mb-6">
            {data.map((row) => (
              <div key={row.period} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-24 shrink-0">{row.period}</span>
                <div className="flex-1 bg-gray-50 rounded h-6 relative overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded"
                    style={{ width: `${(row.salesCents / maxSales) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-700 w-24 text-right shrink-0">
                  ₹{centsToDisplay(row.salesCents)}
                </span>
              </div>
            ))}
          </div>

          <table className="w-full text-sm border-t border-gray-100 pt-4">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 font-medium">Period</th>
                <th className="py-2 font-medium text-right">Sales</th>
                <th className="py-2 font-medium text-right">Tax Collected</th>
                <th className="py-2 font-medium text-right">Transactions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.period} className="border-t border-gray-50">
                  <td className="py-2 text-gray-800">{row.period}</td>
                  <td className="py-2 text-right text-gray-700">₹{centsToDisplay(row.salesCents)}</td>
                  <td className="py-2 text-right text-gray-700">₹{centsToDisplay(row.taxCents)}</td>
                  <td className="py-2 text-right text-gray-700">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────
// Shared: balanced/unbalanced badge
// ─────────────────────────────
function BalanceBadge({ isBalanced }: { isBalanced: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${
        isBalanced ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
      }`}
    >
      {isBalanced ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
      {isBalanced ? 'Books are balanced' : 'Books are NOT balanced — check ledger entries'}
    </div>
  );
}