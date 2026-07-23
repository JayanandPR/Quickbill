import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '../lib/api';
import type { Customer } from '../types';

const customerFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().optional(),
  phone: z.string().optional(),
});

type CustomerForm = z.infer<typeof customerFormSchema>;

interface CustomerModalProps {
  customer: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function CustomerModal({ customer, onClose, onSaved }: CustomerModalProps) {
  const [serverError, setServerError] = useState('');
  const isEditing = !!customer;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerForm>({ resolver: zodResolver(customerFormSchema) });

  useEffect(() => {
    reset({
      name: customer?.name ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
    });
  }, [customer, reset]);

  async function onSubmit(data: CustomerForm) {
    setServerError('');
    try {
      if (isEditing) {
        await api.put(`/customers/${customer!.id}`, data);
      } else {
        await api.post('/customers', data);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEditing ? 'Edit Customer' : 'New Customer'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
              placeholder="e.g. Ramesh Kumar"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-gray-400">(optional)</span>
            </label>
            <input
              {...register('phone')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="9876543210"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-gray-400">(optional)</span>
            </label>
            <input
              {...register('email')}
              type="email"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ramesh@example.com"
            />
          </div>

          {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}