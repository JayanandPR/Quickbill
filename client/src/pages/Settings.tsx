import { useEffect, useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import api from '../lib/api';
import type { BusinessSettings } from '../types';

export default function Settings() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<{ settings: BusinessSettings }>('/settings').then((res) => {
      setSettings(res.data.settings);
      setBusinessName(res.data.settings.businessName);
      setAddress(res.data.settings.address ?? '');
      setPhone(res.data.settings.phone ?? '');
      setLoading(false);
    });
  }, []);

  async function handleSaveDetails() {
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      const res = await api.put<{ settings: BusinessSettings }>('/settings', {
        businessName,
        address,
        phone,
      });
      setSettings(res.data.settings);
      setSuccess('Business details updated');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await api.post<{ settings: BusinessSettings }>('/settings/logo', formData);
      setSettings(res.data.settings);
      setSuccess('Logo updated');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (loading) {
    return <div className="p-8 text-gray-400">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-semibold text-gray-800 mb-1">Business Settings</h1>
      <p className="text-sm text-gray-400 mb-6">
        This information appears on your generated invoices and receipts
      </p>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Business Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Business logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-gray-300">No logo</span>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoSelected}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                <Upload size={14} />
                {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </label>
              <p className="text-xs text-gray-400 mt-1">PNG or JPG, up to 5MB</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address <span className="text-gray-400">(optional)</span>
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, City, State, PIN"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-gray-400">(optional)</span>
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <button
            onClick={handleSaveDetails}
            disabled={isSaving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}