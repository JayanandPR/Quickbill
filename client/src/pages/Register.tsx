import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'CASHIER']),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState('');

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'CASHIER' },
  });

  async function onSubmit(data: RegisterForm) {
    setServerError('');
    try {
      const res = await api.post('/auth/register', data);
      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-800">Create Account</h1>
        <p className="text-gray-500 text-sm mt-1 mb-6">Register a new QuickBill user</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              {...registerField('name')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Jayanand"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              {...registerField('email')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              {...registerField('password')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              {...registerField('role')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="CASHIER">Cashier</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-4 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}