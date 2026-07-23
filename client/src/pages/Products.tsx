import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import { centsToDisplay } from '../lib/currency';
import type { Product, Category } from '../types';
import ProductModal from '../components/ProductModal';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 10 });

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '10' };
      if (search) params.search = search;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/products', { params });
      setProducts(res.data.products);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, page]);

  useEffect(() => {
    api.get<{ categories: Category[] }>('/categories').then((res) => {
      setCategories(res.data.categories);
    });
  }, []);

  // Debounce search so we're not firing a request on every keystroke
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadProducts();
    }, 300);
    return () => clearTimeout(timeout);
  }, [loadProducts]);

  function openCreateModal() {
    if (categories.length === 0) {
      alert('Create a category first before adding products.');
      return;
    }
    setEditingProduct(null);
    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setModalOpen(true);
  }

  async function handleDelete() {
    if (!deletingProduct) return;
    try {
      await api.delete(`/products/${deletingProduct.id}`);
      setDeletingProduct(null);
      loadProducts();
    } catch (err) {
      console.error('Failed to delete product', err);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Products</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your inventory catalog</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} />
          New Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or SKU..."
            className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="DISCONTINUED">Discontinued</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="px-5 py-3 font-medium">Product</th>
              <th className="px-5 py-3 font-medium">SKU</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Price</th>
              <th className="px-5 py-3 font-medium">Stock</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-center text-gray-400">
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const isLowStock = product.stockQuantity <= product.reorderPoint;
                return (
                  <tr
                    key={product.id}
                    className={`border-b border-gray-50 last:border-0 ${
                      isLowStock ? 'bg-red-50/50' : ''
                    }`}
                  >
                    <td className="px-5 py-3 text-gray-800 font-medium">{product.name}</td>
                    <td className="px-5 py-3 text-gray-500">{product.sku}</td>
                    <td className="px-5 py-3 text-gray-500">{product.category?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-700">
                      ₹{centsToDisplay(product.sellPriceCents)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={isLowStock ? 'text-red-600 font-medium' : 'text-gray-700'}>
                          {product.stockQuantity} {product.unit}
                        </span>
                        {isLowStock && <AlertTriangle size={14} className="text-red-500" />}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          product.status === 'ACTIVE'
                            ? 'bg-green-50 text-green-700'
                            : product.status === 'INACTIVE'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => openEditModal(product)}
                          className="text-gray-400 hover:text-blue-600"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingProduct(product)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={setPage}
        />
      </div>

      {modalOpen && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => setModalOpen(false)}
          onSaved={loadProducts}
        />
      )}

      {deletingProduct && (
        <ConfirmDialog
          title="Delete Product"
          message={`Are you sure you want to delete "${deletingProduct.name}"? It will be soft-deleted and marked Discontinued.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingProduct(null)}
        />
      )}
    </div>
  );
}