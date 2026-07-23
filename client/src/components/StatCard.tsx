import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: 'blue' | 'red' | 'green';
}

const accentClasses = {
  blue: 'bg-blue-50 text-blue-600',
  red: 'bg-red-50 text-red-600',
  green: 'bg-green-50 text-green-600',
};

export default function StatCard({ label, value, icon: Icon, accent = 'blue' }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${accentClasses[accent]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xl font-semibold text-gray-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}