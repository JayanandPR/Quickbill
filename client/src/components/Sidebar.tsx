import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Tags, Users, ShoppingCart, UserCircle, Truck, BarChart3, PackagePlus, Receipt } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-50 text-blue-700'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`;

export default function Sidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-100">
        <h1 className="text-lg font-semibold text-gray-800">QuickBill</h1>
        <p className="text-xs text-gray-400 mt-0.5">Retail & Accounting</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <NavLink to="/dashboard" end className={navItemClass}>
          <LayoutDashboard size={18} />
          Dashboard
        </NavLink>

        {/* Billing screen lands in a later phase — visible to both roles */}
        <NavLink to="/billing" className={navItemClass}>
          <ShoppingCart size={18} />
          Billing
        </NavLink>

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Inventory
            </div>
            <NavLink to="/products" className={navItemClass}>
              <Package size={18} />
              Products
            </NavLink>
            <NavLink to="/categories" className={navItemClass}>
              <Tags size={18} />
              Categories
            </NavLink>
            <NavLink to="/purchases" className={navItemClass}>
              <PackagePlus size={18} />
              Purchases
            </NavLink>
            <NavLink to="/sales" className={navItemClass}>
              <Receipt size={18} />
              Sales
            </NavLink>
            <NavLink to="/customers" className={navItemClass}>
              <UserCircle size={18} />
              Customers
            </NavLink>
            <NavLink to="/vendors" className={navItemClass}>
              <Truck size={18} />
              Vendors
            </NavLink>
            <NavLink to="/expenses" className={navItemClass}>
              <Receipt size={18} />
              Expenses
            </NavLink>

            <div className="pt-4 pb-1 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Admin
            </div>
            <NavLink to="/users" className={navItemClass}>
              <Users size={18} />
              Users
            </NavLink>
            <NavLink to="/reports" className={navItemClass}>
              <BarChart3 size={18} />
              Reports
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  );
}