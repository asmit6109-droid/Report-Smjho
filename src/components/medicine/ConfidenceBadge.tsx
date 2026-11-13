import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { ConfidenceLevel } from '../../types/medicine';
import { SupportedLanguage } from '../../utils/translations';
import { medicineTranslations } from '../../utils/medicineTranslations';

interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel;
  language: SupportedLanguage;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  language,
}) => {
  const mt = medicineTranslations[language];

  if (confidence === 'high') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-900">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
        <span>{mt.confidenceHigh}</span>
      </span>
    );
  }

  if (confidence === 'medium') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-950">
        <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
        <span>{mt.confidenceMedium}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-300 px-2.5 py-0.5 text-[11px] font-extrabold text-rose-900">
      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
      <span>{mt.confidenceLow}</span>
    </span>
  );
};
