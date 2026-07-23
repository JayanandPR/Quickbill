import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';
import api from '../lib/api';

const newUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'CASHIER']),
});

type NewUserForm = z.infer<typeof newUserSchema>;

export default function Users() {
  const [modalOpen, setModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewUserForm>({
    resolver: zodResolver(newUserSchema),
    defaultValues: { role: 'CASHIER' },
  });

  async function onSubmit(data: NewUserForm) {
    setServerError('');
    try {
      await api.post('/auth/register', data);
      setSuccessMessage(`${data.name} was added as ${data.role === 'ADMIN' ? 'an Admin' : 'a Cashier'}`);
      reset();
      setModalOpen(false);
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Failed to create user.');
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Users</h1>
          <p className="text-sm text-gray-400 mt-1">Manage who can access QuickBill</p>
        </div>
        <button
          onClick={() => {
            setSuccessMessage('');
            setModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} />
          New User
        </button>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-4 py-3 mb-4">
          {successMessage}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 text-sm text-gray-500">
        A full user list with edit/deactivate controls can be added here later — for now, use{' '}
        <span className="font-medium text-gray-700">New User</span> to create Admin or Cashier accounts.
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">New User</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  {...register('name')}
                  autoFocus
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  {...register('password')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  {...register('role')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CASHIER">Cashier</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}