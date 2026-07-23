import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import api from '../lib/api';
import type { Customer } from '../types';
import CustomerModal from '../components/CustomerModal';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 10 });

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers', {
        params: { page: String(page), limit: '10', ...(search ? { search } : {}) },
      });
      setCustomers(res.data.customers);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(loadCustomers, 300);
    return () => clearTimeout(timeout);
  }, [loadCustomers]);

  async function handleDelete() {
    if (!deletingCustomer) return;
    try {
      await api.delete(`/customers/${deletingCustomer.id}`);
      setDeletingCustomer(null);
      loadCustomers();
    } catch (err) {
      console.error('Failed to delete customer', err);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Customers</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your customer directory</p>
        </div>
        <button
          onClick={() => {
            setEditingCustomer(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} />
          New Customer
        </button>
      </div>

      <div className="relative max-w-xs mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or email..."
          className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Phone</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-gray-400">Loading...</td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-gray-400">No customers found.</td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 text-gray-800 font-medium">{c.name}</td>
                  <td className="px-5 py-3 text-gray-500">{c.phone || '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{c.email || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setEditingCustomer(c);
                          setModalOpen(true);
                        }}
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeletingCustomer(c)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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
        <CustomerModal
          customer={editingCustomer}
          onClose={() => setModalOpen(false)}
          onSaved={loadCustomers}
        />
      )}

      {deletingCustomer && (
        <ConfirmDialog
          title="Delete Customer"
          message={`Are you sure you want to delete "${deletingCustomer.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingCustomer(null)}
        />
      )}
    </div>
  );
}