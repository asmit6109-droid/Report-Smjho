import React from 'react';
import { Finding } from '../types/report';
import { SupportedLanguage, translations } from '../utils/translations';
import { CheckCircle2, ArrowUp, ArrowDown, AlertOctagon } from 'lucide-react';

interface FindingGaugeProps {
  finding: Finding;
  language: SupportedLanguage;
  isFocused?: boolean;
}

export const FindingGauge: React.FC<FindingGaugeProps> = ({
  finding,
  language,
  isFocused = false,
}) => {
  const t = translations[language];
  const displayName = finding.translations?.[language]?.name || finding.name;

  let pointerPercent = 50;
  if (finding.status === 'low') pointerPercent = 18;
  else if (finding.status === 'high') pointerPercent = 82;
  else if (finding.status === 'critical') pointerPercent = 94;

  const badge =
    finding.status === 'low'
      ? {
          bg: 'bg-[var(--color-caution-soft)] text-[var(--color-text)]',
          icon: <ArrowDown className="w-4 h-4 text-[var(--color-caution)] shrink-0" />,
          label: t.valueLow,
        }
      : finding.status === 'high'
      ? {
          bg: 'bg-[var(--color-caution-soft)] text-[var(--color-text)]',
          icon: <ArrowUp className="w-4 h-4 text-[var(--color-caution)] shrink-0" />,
          label: t.valueHigh,
        }
      : finding.status === 'critical'
      ? {
          bg: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
          icon: <AlertOctagon className="w-4 h-4 text-[var(--color-danger)] shrink-0" />,
          label: language === 'hi' ? 'गंभीर' : language === 'or' ? 'ଅତ୍ୟଧିକ' : 'High',
        }
      : {
          bg: 'bg-[var(--color-normal-soft)] text-[var(--color-normal)]',
          icon: <CheckCircle2 className="w-4 h-4 text-[var(--color-normal)] shrink-0" />,
          label: t.valueNormal,
        };

  return (
    <div
      id={`finding-${finding.id}`}
      className={`rs-card p-5 space-y-3 transition ${
        isFocused ? 'ring-2 ring-[var(--color-brand)] ring-offset-2' : ''
      }`}
    >
      {/* Name + Value + Status (icon + label) */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-[var(--color-text)] text-base truncate">{displayName}</h4>
            {finding.source_label && (
              <span className="inline-flex items-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)] px-2.5 py-0.5 text-xs font-extrabold">
                {finding.source_label}
                {finding.source_date ? ` • ${finding.source_date}` : ''}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-extrabold text-[var(--color-text)] font-mono">
              {finding.value}
            </span>
            {finding.unit && (
              <span className="text-base font-semibold text-[var(--color-text-secondary)]">
                {finding.unit}
              </span>
            )}
          </div>
        </div>

        <div
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-base font-bold ${badge.bg}`}
        >
          {badge.icon}
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Simple 3-zone Visual Bar using exact severity tokens */}
      <div>
        <div className="relative h-3 w-full rounded-full bg-[var(--color-surface-subtle)] overflow-hidden flex">
          <div className="w-[30%] bg-[var(--color-caution)]/75" />
          <div className="w-[40%] bg-[var(--color-normal)]" />
          <div className="w-[30%] bg-[var(--color-danger)]/85" />
        </div>
        <div className="relative h-3 w-full">
          <div
            className="absolute top-0.5 -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${pointerPercent}%` }}
          >
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[6px] border-b-[var(--color-text)]" />
          </div>
        </div>
      </div>
    </div>
  );
};
