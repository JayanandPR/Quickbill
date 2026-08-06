import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { BusinessSettings } from '../types';

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="p-8 max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 mb-1">Settings</h1>
        <p className="text-sm text-gray-400">Manage your account{isAdmin ? ' and business details' : ''}</p>
      </div>

      <AccountSettingsSection />
      {isAdmin && <BusinessSettingsSection />}
    </div>
  );
}

// ─────────────────────────────
// ACCOUNT SETTINGS — available to everyone
// ─────────────────────────────

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

function AccountSettingsSection() {
  const { user, updateUser } = useAuth();
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '' },
  });

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  async function onProfileSubmit(data: ProfileForm) {
    setProfileError('');
    setProfileSuccess('');
    try {
      const res = await api.put('/auth/me', data);
      updateUser(res.data.user);
      setProfileSuccess('Name updated successfully');
    } catch (err: any) {
      setProfileError(err.response?.data?.message || 'Failed to update name.');
    }
  }

  async function onPasswordSubmit(data: PasswordForm) {
    setPasswordError('');
    setPasswordSuccess('');
    try {
      await api.put('/auth/me/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setPasswordSuccess('Password changed successfully');
      passwordForm.reset();
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to change password.');
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
        Account Settings
      </h2>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Change name */}
        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              {...profileForm.register('name')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {profileForm.formState.errors.name && (
              <p className="text-red-500 text-xs mt-1">{profileForm.formState.errors.name.message}</p>
            )}
          </div>
          {profileError && <p className="text-red-500 text-sm">{profileError}</p>}
          {profileSuccess && <p className="text-green-600 text-sm">{profileSuccess}</p>}
          <button
            type="submit"
            disabled={profileForm.formState.isSubmitting}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {profileForm.formState.isSubmitting ? 'Saving...' : 'Update Name'}
          </button>
        </form>

        <div className="border-t border-gray-100" />

        {/* Change password */}
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Change Password</p>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Current Password</label>
            <input
              type="password"
              {...passwordForm.register('currentPassword')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {passwordForm.formState.errors.currentPassword && (
              <p className="text-red-500 text-xs mt-1">
                {passwordForm.formState.errors.currentPassword.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">New Password</label>
            <input
              type="password"
              {...passwordForm.register('newPassword')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {passwordForm.formState.errors.newPassword && (
              <p className="text-red-500 text-xs mt-1">
                {passwordForm.formState.errors.newPassword.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Confirm New Password</label>
            <input
              type="password"
              {...passwordForm.register('confirmPassword')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {passwordForm.formState.errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">
                {passwordForm.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
          {passwordSuccess && <p className="text-green-600 text-sm">{passwordSuccess}</p>}

          <button
            type="submit"
            disabled={passwordForm.formState.isSubmitting}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {passwordForm.formState.isSubmitting ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────
// BUSINESS SETTINGS — Admin only
// ─────────────────────────────

const businessSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
});
type BusinessForm = z.infer<typeof businessSchema>;

function BusinessSettingsSection() {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BusinessForm>({ resolver: zodResolver(businessSchema) });

  useEffect(() => {
    api.get<{ settings: BusinessSettings }>('/settings').then((res) => {
      reset({
        businessName: res.data.settings.businessName,
        address: res.data.settings.address ?? '',
        phone: res.data.settings.phone ?? '',
      });
      setCurrentLogoUrl(res.data.settings.logoUrl);
      setLoading(false);
    });
  }, [reset]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function onSubmit(data: BusinessForm) {
    setError('');
    setSuccess('');
    try {
      const formData = new FormData();
      formData.append('businessName', data.businessName);
      if (data.address) formData.append('address', data.address);
      if (data.phone) formData.append('phone', data.phone);
      if (logoFile) formData.append('logo', logoFile);

      const res = await api.put<{ settings: BusinessSettings }>('/settings', formData);
      setCurrentLogoUrl(res.data.settings.logoUrl);
      setLogoFile(null);
      setLogoPreview(null);
      setSuccess('Business settings updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update settings.');
    }
  }

  if (loading) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
        Business Settings
      </h2>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <input
              {...register('businessName')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.businessName && (
              <p className="text-red-500 text-xs mt-1">{errors.businessName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address <span className="text-gray-400">(optional)</span>
            </label>
            <input
              {...register('address')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-gray-400">(optional)</span>
            </label>
            <input
              {...register('phone')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo <span className="text-gray-400">(optional)</span>
            </label>
            <div className="flex items-center gap-4">
              {(logoPreview || currentLogoUrl) && (
                <img
                  src={logoPreview || currentLogoUrl}
                  alt="Logo preview"
                  className="w-16 h-16 object-contain border border-gray-200 rounded-md"
                />
              )}
              <label className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md cursor-pointer text-gray-600 hover:bg-gray-50">
                <Upload size={14} />
                {currentLogoUrl ? 'Change Logo' : 'Upload Logo'}
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">PNG or JPG, up to 2MB</p>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && (
            <p className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-md px-3 py-2">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}