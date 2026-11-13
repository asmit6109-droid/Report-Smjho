import React from 'react';
import { Finding } from '../types/report';
import { SupportedLanguage, translations } from '../utils/translations';
import { CheckCircle2, ArrowUp, ArrowDown, AlertTriangle, AlertCircle } from 'lucide-react';

interface FindingGaugeProps {
  finding: Finding;
  language: SupportedLanguage;
}

export const FindingGauge: React.FC<FindingGaugeProps> = ({ finding, language }) => {
  const t = translations[language];

  const displayName =
    finding.translations?.[language]?.name || finding.name;

  const displayExplanation =
    finding.translations?.[language]?.short_explanation || finding.short_explanation;

  // Gauge needle position calculation
  let pointerPercent = 50; // default middle
  if (finding.status === 'low') {
    pointerPercent = 18;
  } else if (finding.status === 'normal') {
    pointerPercent = 50;
  } else if (finding.status === 'high') {
    pointerPercent = 82;
  } else if (finding.status === 'critical') {
    pointerPercent = 94;
  }

  const isAbnormal = finding.status !== 'normal';

  // Status visual configurations with color-blind distinct icons
  const getStatusBadge = () => {
    switch (finding.status) {
      case 'low':
        return {
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          icon: <ArrowDown className="w-4 h-4 text-amber-700" />,
          label: t.valueLow,
        };
      case 'high':
        return {
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          icon: <ArrowUp className="w-4 h-4 text-amber-700" />,
          label: t.valueHigh,
        };
      case 'critical':
        return {
          bg: 'bg-rose-100 text-rose-950 border-rose-300',
          icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
          label: language === 'hi' ? 'गंभीर' : language === 'or' ? 'ଅତ୍ୟଧିକ' : 'Critical High',
        };
      default:
        return {
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          label: t.valueNormal,
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div
      className={`rounded-2xl border p-4 shadow-xs transition ${
        isAbnormal
          ? finding.status === 'critical'
            ? 'border-rose-300 bg-rose-50/40 ring-1 ring-rose-200'
            : 'border-amber-300 bg-amber-50/30'
          : 'border-slate-200 bg-white'
      }`}
    >
      {/* Test Name & Status Badge */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-900 text-base leading-snug">{displayName}</h4>
          {/* Reference range source badge */}
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {finding.range_source === 'general' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                {t.generalRange}
              </span>
            ) : (
              <span className="inline-flex items-center text-[11px] font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                {t.labRange}
              </span>
            )}
            {finding.reference_range && (
              <span className="text-xs text-slate-500 font-mono">
                Normal: {finding.reference_range}
              </span>
            )}
          </div>
        </div>

        {/* Status Pill with icon + text for colorblind clarity */}
        <div className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${badge.bg}`}>
          {badge.icon}
          <span>{badge.label}</span>
        </div>
      </div>

      {/* User's Value Presentation */}
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
          {finding.value}
        </span>
        {finding.unit && (
          <span className="text-sm font-semibold text-slate-600">{finding.unit}</span>
        )}
      </div>

      {/* Visual Bar / Gauge */}
      <div className="mt-3">
        {/* Track with 3 Zones (Low | Normal | High) */}
        <div className="relative h-3 w-full rounded-full bg-slate-200 overflow-hidden flex">
          {/* Low Zone (Yellow/Blue) */}
          <div className="w-[30%] bg-amber-300/80" title="Low" />
          {/* Normal Zone (Green) */}
          <div className="w-[40%] bg-emerald-500" title="Normal" />
          {/* High Zone (Red/Orange) */}
          <div className="w-[30%] bg-rose-400" title="High" />
        </div>

        {/* Pointer Triangle Needle */}
        <div className="relative h-4 w-full">
          <div
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center transition-all duration-500"
            style={{ left: `${pointerPercent}%` }}
          >
            {/* Arrow Up pointer */}
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[6px] border-b-slate-900" />
            <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-tighter">
              You
            </span>
          </div>
        </div>

        {/* Zone Labels */}
        <div className="flex justify-between text-[11px] font-medium text-slate-500 px-1 mt-0.5">
          <span className="text-amber-800">{t.valueLow}</span>
          <span className="text-emerald-700 font-semibold">{t.valueNormal}</span>
          <span className="text-rose-700">{t.valueHigh}</span>
        </div>
      </div>

      {/* Simple 1-2 line explanation */}
      {displayExplanation && (
        <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-xs text-slate-700 leading-relaxed font-medium">
          {displayExplanation}
        </div>
      )}
    </div>
  );
};
