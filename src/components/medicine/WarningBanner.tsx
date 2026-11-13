import React from 'react';
import { LucideIcon } from 'lucide-react';

interface WarningBannerProps {
  variant: 'emergency' | 'danger' | 'warning' | 'caution';
  icon: LucideIcon;
  title: string;
  body?: string;
  children?: React.ReactNode;
}

export const WarningBanner: React.FC<WarningBannerProps> = ({
  variant,
  icon: Icon,
  title,
  body,
  children,
}) => {
  const styles =
    variant === 'emergency'
      ? 'bg-rose-600 border-rose-700 text-white'
      : variant === 'danger'
      ? 'bg-rose-50 border-rose-300 text-rose-950'
      : variant === 'warning'
      ? 'bg-orange-50 border-orange-300 text-orange-950'
      : 'bg-amber-50 border-amber-300 text-amber-950';

  const iconColor =
    variant === 'emergency'
      ? 'text-white'
      : variant === 'danger'
      ? 'text-rose-600'
      : variant === 'warning'
      ? 'text-orange-600'
      : 'text-amber-700';

  return (
    <div className={`rounded-2xl border-2 p-3.5 shadow-xs flex items-start gap-3 ${styles}`}>
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <h3 className="text-xs font-black leading-snug">{title}</h3>
        {body && (
          <p className="text-xs font-medium mt-1 leading-relaxed opacity-90">{body}</p>
        )}
        {children}
      </div>
    </div>
  );
};
