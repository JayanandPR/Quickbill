import { useEffect, useState } from 'react';
import { Package, AlertTriangle, Tags, TrendingUp, TrendingDown, Receipt } from 'lucide-react';
import api from '../lib/api';
import { centsToDisplay } from '../lib/currency';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import type { Product, Category } from '../types';

export default function Dashboard() {
  const { user } = useAuth();
  const [productCount, setProductCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);

  const [totalRevenueCents, setTotalRevenueCents] = useState(0);
  const [netProfitCents, setNetProfitCents] = useState(0);
  const [todaySalesCents, setTodaySalesCents] = useState(0);
  const [todayTxCount, setTodayTxCount] = useState(0);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const today = new Date().toISOString().split('T')[0];

        const [productsRes, lowStockRes, categoriesRes, plRes, salesRes] = await Promise.all([
          api.get<{ products: Product[]; pagination: { total: number } }>('/products'),
          api.get<{ products: Product[] }>('/products/low-stock'),
          api.get<{ categories: Category[] }>('/categories'),
          api.get('/reports/profit-and-loss'),
          api.get('/reports/sales', { params: { groupBy: 'day', from: today, to: today } }),
        ]);

        setProductCount(productsRes.data.pagination.total);
        setLowStockCount(lowStockRes.data.products.length);
        setCategoryCount(categoriesRes.data.categories.length);
        setTotalRevenueCents(plRes.data.totalRevenueCents ?? 0);
        setNetProfitCents(plRes.data.netProfitCents ?? 0);

        const todayRow = salesRes.data.report?.[0];
        setTodaySalesCents(todayRow?.salesCents ?? 0);
        setTodayTxCount(todayRow?.count ?? 0);
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const isProfit = netProfitCents >= 0;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-800">
        Welcome back, {user?.name?.split(' ')[0]}
      </h1>
      <p className="text-gray-400 text-sm mt-1">Here's what's happening in your store today.</p>

      {/* Financial snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <StatCard
          label="Today's Sales"
          value={loading ? '—' : `₹${centsToDisplay(todaySalesCents)}`}
          icon={Receipt}
          accent="blue"
        />
        <StatCard
          label="Total Revenue (All Time)"
          value={loading ? '—' : `₹${centsToDisplay(totalRevenueCents)}`}
          icon={TrendingUp}
          accent="green"
        />
        <StatCard
          label={isProfit ? 'Net Profit' : 'Net Loss'}
          value={loading ? '—' : `₹${centsToDisplay(Math.abs(netProfitCents))}`}
          icon={isProfit ? TrendingUp : TrendingDown}
          accent={isProfit ? 'green' : 'red'}
        />
      </div>

      {/* Inventory snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <StatCard
          label="Total Products"
          value={loading ? '—' : productCount}
          icon={Package}
          accent="blue"
        />
        <StatCard
          label="Low Stock Alerts"
          value={loading ? '—' : lowStockCount}
          icon={AlertTriangle}
          accent="red"
        />
        <StatCard
          label="Categories"
          value={loading ? '—' : categoryCount}
          icon={Tags}
          accent="green"
        />
      </div>

      {!loading && todayTxCount === 0 && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500">
            No sales recorded today yet. Head to <span className="font-medium text-gray-700">Billing</span> to ring up your first sale of the day.
          </p>
        </div>
      )}
    </div>
  );
}