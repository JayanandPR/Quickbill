import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, AlertTriangle, Truck, Receipt } from 'lucide-react';
import api from '../lib/api';

interface NotificationItem {
  id: string;
  label: string;
  detail: string;
}

interface NotificationsData {
  lowStock: NotificationItem[];
  overdueBills: NotificationItem[];
  overdueExpenses: NotificationItem[];
  totalCount: number;
}

const REFRESH_INTERVAL_MS = 60000;
const MAX_ITEMS_SHOWN = 5;

export default function NotificationsBell() {
  const [data, setData] = useState<NotificationsData | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  async function loadNotifications() {
    try {
      const res = await api.get<NotificationsData>('/reports/notifications');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  }

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const count = data?.totalCount ?? 0;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative text-gray-400 hover:text-gray-700 transition-colors"
        title="Notifications"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-semibold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg border border-gray-200 shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">Notifications</p>
          </div>

          {!data || count === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">You're all caught up 🎉</p>
          ) : (
            <div className="py-2">
              <NotificationSection
                icon={AlertTriangle}
                iconColor="text-red-500"
                title="Low Stock"
                items={data.lowStock}
                linkTo="/products"
                onItemClick={() => setOpen(false)}
              />
              <NotificationSection
                icon={Truck}
                iconColor="text-orange-500"
                title="Overdue Vendor Bills"
                items={data.overdueBills}
                linkTo="/purchases"
                onItemClick={() => setOpen(false)}
              />
              <NotificationSection
                icon={Receipt}
                iconColor="text-orange-500"
                title="Overdue Expenses"
                items={data.overdueExpenses}
                linkTo="/expenses"
                onItemClick={() => setOpen(false)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface NotificationSectionProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  title: string;
  items: NotificationItem[];
  linkTo: string;
  onItemClick: () => void;
}

function NotificationSection({ icon: Icon, iconColor, title, items, linkTo, onItemClick }: NotificationSectionProps) {
  if (items.length === 0) return null;

  const shown = items.slice(0, MAX_ITEMS_SHOWN);
  const overflow = items.length - shown.length;

  return (
    <div className="px-2 py-2">
      <div className="flex items-center gap-1.5 px-2 mb-1">
        <Icon size={13} className={iconColor} />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      </div>
      {shown.map((item) => (
        <Link
          key={item.id}
          to={linkTo}
          onClick={onItemClick}
          className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-50 text-sm"
        >
          <span className="text-gray-700">{item.label}</span>
          <span className="text-gray-400 text-xs">{item.detail}</span>
        </Link>
      ))}
      {overflow > 0 && (
        <Link
          to={linkTo}
          onClick={onItemClick}
          className="block px-2 py-1 text-xs text-blue-600 hover:underline"
        >
          +{overflow} more
        </Link>
      )}
    </div>
  );
}