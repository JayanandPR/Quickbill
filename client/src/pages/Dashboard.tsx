import { useEffect, useState } from 'react';
import { Package, AlertTriangle, Tags } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import type { Product, Category } from '../types';

export default function Dashboard() {
  const { user } = useAuth();
  const [productCount, setProductCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [productsRes, lowStockRes, categoriesRes] = await Promise.all([
          api.get<{ products: Product[]; pagination: { total: number } }>('/products'),
          api.get<{ products: Product[] }>('/products/low-stock'),
          api.get<{ categories: Category[] }>('/categories'),
        ]);
        setProductCount(productsRes.data.pagination.total);
        setLowStockCount(lowStockRes.data.products.length);
        setCategoryCount(categoriesRes.data.categories.length);
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-800">
        Welcome back, {user?.name?.split(' ')[0]}
      </h1>
      <p className="text-gray-400 text-sm mt-1">Here's what's happening in your store today.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
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

      <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-sm text-gray-500">
          Sales analytics, revenue, and profit/loss charts will appear here once billing
          (Phase 3) and the accounting ledger (Phase 4) are built.
        </p>
      </div>
    </div>
  );
}