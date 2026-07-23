import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../lib/api';
import type { Category } from '../types';
import CategoryModal from '../components/CategoryModal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState('');

  async function loadCategories() {
    setLoading(true);
    try {
      const res = await api.get<{ categories: Category[] }>('/categories');
      setCategories(res.data.categories);
    } catch (err) {
      console.error('Failed to load categories', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function openCreateModal() {
    setEditingCategory(null);
    setModalOpen(true);
  }

  function openEditModal(category: Category) {
    setEditingCategory(category);
    setModalOpen(true);
  }

  async function handleDelete() {
    if (!deletingCategory) return;
    setDeleteError('');
    try {
      await api.delete(`/categories/${deletingCategory.id}`);
      setDeletingCategory(null);
      loadCategories();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete category.');
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Categories</h1>
          <p className="text-sm text-gray-400 mt-1">Organize your product catalog</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} />
          New Category
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Created</th>
              <th className="px-5 py-3 font-medium w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-gray-400">
                  No categories yet. Create your first one.
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 text-gray-800 font-medium">{cat.name}</td>
                  <td className="px-5 py-3 text-gray-400">
                    {new Date(cat.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeletingCategory(cat)}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete"
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
        <CategoryModal
          category={editingCategory}
          onClose={() => setModalOpen(false)}
          onSaved={loadCategories}
        />
      )}

      {deletingCategory && (
        <ConfirmDialog
          title="Delete Category"
          message={
            deleteError ||
            `Are you sure you want to delete "${deletingCategory.name}"? This can't be undone.`
          }
          onConfirm={handleDelete}
          onCancel={() => {
            setDeletingCategory(null);
            setDeleteError('');
          }}
        />
      )}
    </div>
  );
}