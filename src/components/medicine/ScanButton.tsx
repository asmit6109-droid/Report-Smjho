import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ScanButtonProps {
  label: string;
  subtitle?: string;
  icon: LucideIcon;
  colorClass: string;
  onClick: () => void;
}

export const ScanButton: React.FC<ScanButtonProps> = ({
  label,
  subtitle,
  icon: Icon,
  colorClass,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-3xl py-4 px-3 text-white shadow-lg transition active:scale-98 ${colorClass}`}
    >
      <div className="rounded-2xl bg-white/20 p-2.5">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-sm font-extrabold leading-tight">{label}</span>
      {subtitle && (
        <span className="text-[10px] font-semibold opacity-85 leading-tight px-1">
          {subtitle}
        </span>
      )}
    </button>
  );
};
