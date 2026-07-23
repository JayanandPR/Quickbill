import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '../lib/api';
import { centsToDisplay, displayToCents } from '../lib/currency';
import type { Product, Category } from '../types';

const productFormSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  categoryId: z.string().min(1, 'Please select a category'),
  costPrice: z.string().min(1, 'Cost price is required'),
  sellPrice: z.string().min(1, 'Selling price is required'),
  taxRatePercent: z.string().min(1, 'Tax rate is required'),
  unit: z.string().min(1),
  stockQuantity: z.string().min(1, 'Stock quantity is required'),
  reorderPoint: z.string().min(1, 'Reorder point is required'),
  hsnCode: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductModalProps {
  product: Product | null; // null = creating new
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ProductModal({ product, categories, onClose, onSaved }: ProductModalProps) {
  const [serverError, setServerError] = useState('');
  const isEditing = !!product;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
        unit: 'pcs',
        taxRatePercent: '0',
        stockQuantity: '0',
        reorderPoint: '5',
    },
  });

  useEffect(() => {
    if (product) {
        reset({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode ?? '',
        categoryId: product.categoryId,
        costPrice: centsToDisplay(product.costPriceCents),
        sellPrice: centsToDisplay(product.sellPriceCents),
        taxRatePercent: String(product.taxRatePercent),
        unit: product.unit,
        stockQuantity: String(product.stockQuantity),
        reorderPoint: String(product.reorderPoint),
        hsnCode: product.hsnCode ?? '',
        });
    } else {
        reset({
        name: '',
        sku: '',
        barcode: '',
        categoryId: categories[0]?.id ?? '',
        costPrice: '',
        sellPrice: '',
        taxRatePercent: '0',
        unit: 'pcs',
        stockQuantity: '0',
        reorderPoint: '5',
        hsnCode: '',
        });
    }
    }, [product, categories, reset]);

    async function onSubmit(data: ProductFormValues) {
        setServerError('');

        const payload = {
            name: data.name,
            sku: data.sku,
            barcode: data.barcode || undefined,
            categoryId: data.categoryId,
            costPriceCents: displayToCents(data.costPrice),
            sellPriceCents: displayToCents(data.sellPrice),
            taxRatePercent: parseInt(data.taxRatePercent, 10),
            unit: data.unit,
            stockQuantity: parseInt(data.stockQuantity, 10),
            reorderPoint: parseInt(data.reorderPoint, 10),
            hsnCode: data.hsnCode || undefined,
        };

        try {
            if (isEditing) {
            await api.put(`/products/${product!.id}`, payload);
            } else {
            await api.post('/products', payload);
            }
            onSaved();
            onClose();
        } catch (err: any) {
            setServerError(err.response?.data?.message || 'Something went wrong. Please try again.');
        }
    }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEditing ? 'Edit Product' : 'New Product'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input
                {...register('name')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Coca-Cola 500ml"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                {...register('categoryId')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                {...register('sku')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. BEV-001"
              />
              {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Barcode <span className="text-gray-400">(optional)</span>
              </label>
              <input
                {...register('barcode')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 8901030123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (₹)</label>
              <input
                {...register('costPrice')}
                type="number"
                step="0.01"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="30.00"
              />
              {errors.costPrice && (
                <p className="text-red-500 text-xs mt-1">{errors.costPrice.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₹)</label>
              <input
                {...register('sellPrice')}
                type="number"
                step="0.01"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="50.00"
              />
              {errors.sellPrice && (
                <p className="text-red-500 text-xs mt-1">{errors.sellPrice.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
              <input
                {...register('taxRatePercent')}
                type="number"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input
                {...register('unit')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="pcs, kg, litre..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
              <input
                {...register('stockQuantity')}
                type="number"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
              <input
                {...register('reorderPoint')}
                type="number"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                HSN/SAC Code <span className="text-gray-400">(optional)</span>
              </label>
              <input
                {...register('hsnCode')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

          <div className="flex gap-2 justify-end pt-2 border-t border-gray-100 mt-2">
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
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}