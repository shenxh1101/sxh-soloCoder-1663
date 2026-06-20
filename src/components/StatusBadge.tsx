import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type OrderStatus } from '@/types';
import { cn } from '../lib/utils';

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        ORDER_STATUS_COLORS[status]
      )}
    >
      <span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full', {
        'bg-amber-500': status === 'pending',
        'bg-blue-500': status === 'processing',
        'bg-purple-500': status === 'inspecting',
        'bg-green-500': status === 'completed',
        'bg-red-500': status === 'rejected',
      })}></span>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
