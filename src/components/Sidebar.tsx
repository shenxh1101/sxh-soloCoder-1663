import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  CheckSquare,
  Building2,
  Trophy,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { cn } from '../lib/utils';

const menuItems = [
  { path: '/dashboard', label: '工作台', icon: LayoutDashboard, end: true },
  { path: '/orders', label: '外协订单', icon: ClipboardList, end: false },
  { path: '/quality', label: '质量检验', icon: CheckSquare, end: true },
  { path: '/suppliers', label: '供应商管理', icon: Building2, end: true },
  { path: '/suppliers/performance', label: '绩效评价', icon: Trophy, end: true },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-gradient-to-b from-slate-800 to-slate-900 text-white transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-700 px-4">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <ClipboardList className="h-5 w-5" />
            </div>
            <span className="text-base font-bold tracking-wide">外协管理系统</span>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <ClipboardList className="h-5 w-5" />
          </div>
        )}
      </div>

      <nav className="mt-4 px-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white',
                  sidebarCollapsed && 'justify-center px-2'
                )
              }
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <button
        onClick={toggleSidebar}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-700 p-1.5 text-slate-300 transition-colors hover:bg-slate-600 hover:text-white"
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}
