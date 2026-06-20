import { cn } from '../lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  color?: 'blue' | 'green' | 'orange' | 'purple';
}

export default function StatCard({
  title,
  value,
  icon,
  trend,
  trendLabel = '较上月',
  color = 'blue',
}: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-700',
    green: 'from-emerald-500 to-emerald-700',
    orange: 'from-orange-500 to-orange-700',
    purple: 'from-purple-500 to-purple-700',
  };

  const iconBgClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md">
      <div
        className={cn(
          'absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-10',
          colorClasses[color]
        )}
      ></div>

      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-2 text-3xl font-bold text-gray-800">{value}</p>
          </div>
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', iconBgClasses[color])}>
            {icon}
          </div>
        </div>

        {trend !== undefined && (
          <div className="mt-4 flex items-center gap-1 text-sm">
            {trend >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span
              className={cn('font-medium', {
                'text-emerald-600': trend >= 0,
                'text-red-600': trend < 0,
              })}
            >
              {trend >= 0 ? '+' : ''}
              {trend}%
            </span>
            <span className="text-gray-500">{trendLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
