import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import api from '../lib/api';
import type { Vendor } from '../types';
import VendorModal from '../components/VendorModal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ vendors: Vendor[] }>('/vendors', {
        params: search ? { search } : {},
      });
      setVendors(res.data.vendors);
    } catch (err) {
      console.error('Failed to load vendors', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(loadVendors, 300);
    return () => clearTimeout(timeout);
  }, [loadVendors]);

  async function handleDelete() {
    if (!deletingVendor) return;
    try {
      await api.delete(`/vendors/${deletingVendor.id}`);
      setDeletingVendor(null);
      loadVendors();
    } catch (err) {
      console.error('Failed to delete vendor', err);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Vendors</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your supplier directory</p>
        </div>
        <button
          onClick={() => {
            setEditingVendor(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} />
          New Vendor
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
            ) : vendors.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-gray-400">No vendors found.</td>
              </tr>
            ) : (
              vendors.map((v) => (
                <tr key={v.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 text-gray-800 font-medium">{v.name}</td>
                  <td className="px-5 py-3 text-gray-500">{v.phone || '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{v.email || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setEditingVendor(v);
                          setModalOpen(true);
                        }}
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeletingVendor(v)}
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
      </div>

      {modalOpen && (
        <VendorModal
          vendor={editingVendor}
          onClose={() => setModalOpen(false)}
          onSaved={loadVendors}
        />
      )}

      {deletingVendor && (
        <ConfirmDialog
          title="Delete Vendor"
          message={`Are you sure you want to delete "${deletingVendor.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingVendor(null)}
        />
      )}
    </div>
  );
}