import { useEffect, useState } from 'react';
import {
  AlertTriangle, TrendingUp, TrendingDown, Receipt, Users, Wallet,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../lib/api';
import { centsToDisplay } from '../lib/currency';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import type { Product } from '../types';

interface DashboardStats {
  todaySalesCents: number;
  monthRevenueCents: number;
  monthExpenseCents: number;
  monthNetProfitCents: number;
  lowStockCount: number;
  totalDueCents: number;
  overdueCount: number;
  customerCount: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesTrend, setSalesTrend] = useState<{ date: string; sales: number }[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const fourteenDaysAgo = new Date(today);
        fourteenDaysAgo.setDate(today.getDate() - 13);
        const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split('T')[0];

        const [
          todaySalesRes, monthPlRes, lowStockRes, duesRes, customersRes,
          trendRes, recentSalesRes, recentExpensesRes,
        ] = await Promise.all([
          api.get('/reports/sales', { params: { groupBy: 'day', from: todayStr, to: todayStr } }),
          api.get('/reports/profit-and-loss', { params: { from: firstOfMonth, to: todayStr } }),
          api.get<{ products: Product[] }>('/products/low-stock'),
          api.get('/reports/pending-dues'),
          api.get('/customers', { params: { limit: '1' } }),
          api.get('/reports/sales', { params: { groupBy: 'day', from: fourteenDaysAgoStr, to: todayStr } }),
          api.get('/transactions', { params: { limit: '5', page: '1' } }),
          api.get('/expenses', { params: { limit: '5', page: '1' } }),
        ]);

        const todayRow = todaySalesRes.data.report?.[0];

        setStats({
          todaySalesCents: todayRow?.salesCents ?? 0,
          monthRevenueCents: monthPlRes.data.totalRevenueCents ?? 0,
          monthExpenseCents: monthPlRes.data.totalExpenseCents ?? 0,
          monthNetProfitCents: monthPlRes.data.netProfitCents ?? 0,
          lowStockCount: lowStockRes.data.products.length,
          totalDueCents: duesRes.data.totalDueCents ?? 0,
          overdueCount: duesRes.data.overdueCount ?? 0,
          customerCount: customersRes.data.pagination?.total ?? 0,
        });

        // Build a full 14-day series, filling in zero for days with no sales
        const reportMap = new Map(trendRes.data.report.map((r: any) => [r.period, r.salesCents]));
        const series: { date: string; sales: number }[] = [];
        for (let i = 0; i < 14; i++) {
          const d = new Date(fourteenDaysAgo);
          d.setDate(fourteenDaysAgo.getDate() + i);
          const key = d.toISOString().split('T')[0];
          series.push({
            date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            sales: (reportMap.get(key) as number) ?? 0,
          });
        }
        setSalesTrend(series);

        setRecentSales(recentSalesRes.data.transactions);
        setLowStockProducts(lowStockRes.data.products.slice(0, 5));
        setRecentExpenses(recentExpensesRes.data.expenses);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const isProfit = (stats?.monthNetProfitCents ?? 0) >= 0;

  const pieData = stats
    ? [
        { name: 'Revenue', value: stats.monthRevenueCents },
        { name: 'Expenses', value: stats.monthExpenseCents },
      ]
    : [];
  const PIE_COLORS = ['#2563eb', '#ef4444'];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-800">
        Welcome back, {user?.name?.split(' ')[0]}
      </h1>
      <p className="text-gray-400 text-sm mt-1">Here's what's happening in your store today.</p>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
        <StatCard
          label="Today's Sales"
          value={loading ? '—' : `₹${centsToDisplay(stats!.todaySalesCents)}`}
          icon={Receipt}
          accent="blue"
        />
        <StatCard
          label="Revenue (This Month)"
          value={loading ? '—' : `₹${centsToDisplay(stats!.monthRevenueCents)}`}
          icon={TrendingUp}
          accent="green"
        />
        <StatCard
          label={isProfit ? 'Net Profit (Month)' : 'Net Loss (Month)'}
          value={loading ? '—' : `₹${centsToDisplay(Math.abs(stats!.monthNetProfitCents))}`}
          icon={isProfit ? TrendingUp : TrendingDown}
          accent={isProfit ? 'green' : 'red'}
        />
        <StatCard
          label="Low Stock Alerts"
          value={loading ? '—' : stats!.lowStockCount}
          icon={AlertTriangle}
          accent="red"
        />
        <StatCard
          label="Pending Dues"
          value={loading ? '—' : `₹${centsToDisplay(stats!.totalDueCents)}`}
          icon={Wallet}
          accent={stats && stats.overdueCount > 0 ? 'red' : 'yellow'}
        />
        <StatCard
          label="Total Customers"
          value={loading ? '—' : stats!.customerCount}
          icon={Users}
          accent="blue"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Sales Trend (Last 14 Days)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={salesTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} />
              <Tooltip
                formatter={(value: any) => [`₹${centsToDisplay(Number(value))}`, 'Sales']}
                contentStyle={{ fontSize: 12, borderRadius: 6 }}
              />
              <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue vs Expenses (Month)</h3>
          {loading || pieData.every((d) => d.value === 0) ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">
              No data yet this month
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `₹${centsToDisplay(Number(value))}`} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent activity lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Sales</h3>
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : recentSales.length === 0 ? (
            <p className="text-sm text-gray-400">No sales yet.</p>
          ) : (
            <div className="space-y-3">
              {recentSales.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="text-gray-800 font-medium">{tx.invoiceNumber}</p>
                    <p className="text-xs text-gray-400">{tx.customer?.name ?? 'Walk-in'}</p>
                  </div>
                  <p className="text-gray-700 font-medium">₹{centsToDisplay(tx.grandTotalCents)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Low Stock Products</h3>
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : lowStockProducts.length === 0 ? (
            <p className="text-sm text-gray-400">All stock levels are healthy.</p>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.map((p) => (
                <div key={p.id} className="flex justify-between items-center text-sm">
                  <p className="text-gray-800">{p.name}</p>
                  <p className="text-red-600 font-medium">
                    {p.stockQuantity} {p.unit}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Expenses</h3>
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : recentExpenses.length === 0 ? (
            <p className="text-sm text-gray-400">No expenses recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {recentExpenses.map((exp) => (
                <div key={exp.id} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="text-gray-800">{exp.category}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(exp.expenseDate).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-gray-700 font-medium">₹{centsToDisplay(exp.amountCents)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}