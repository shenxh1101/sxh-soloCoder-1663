import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import useAppStore from '../store/useAppStore';
import { cn } from '../lib/utils';

const pageTitles: Record<string, string> = {
  '/dashboard': '工作台',
  '/orders': '外协订单',
  '/orders/new': '新建订单',
  '/quality': '质量检验',
  '/suppliers': '供应商管理',
  '/suppliers/performance': '供应商绩效',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useAppStore();
  const location = useLocation();

  let title = '';
  if (pageTitles[location.pathname]) {
    title = pageTitles[location.pathname];
  } else if (location.pathname.startsWith('/orders/')) {
    title = '订单详情';
  } else {
    title = '外协管理系统';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        <Header title={title} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
