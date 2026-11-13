import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { MedicineAccessLevel } from '../../types/medicine';
import { SupportedLanguage } from '../../utils/translations';
import { medicineTranslations } from '../../utils/medicineTranslations';

interface MedicineTagProps {
  accessLevel: MedicineAccessLevel;
  language: SupportedLanguage;
}

export const MedicineTag: React.FC<MedicineTagProps> = ({
  accessLevel,
  language,
}) => {
  const mt = medicineTranslations[language];

  const meta =
    accessLevel === 'otc'
      ? {
          label: mt.accessOtc,
          dot: 'bg-emerald-500',
          bg: 'bg-emerald-50 border-emerald-300 text-emerald-950',
          icon: CheckCircle2,
        }
      : accessLevel === 'prescription_only'
      ? {
          label: mt.accessPrescriptionOnly,
          dot: 'bg-rose-600',
          bg: 'bg-rose-50 border-rose-300 text-rose-950',
          icon: AlertOctagon,
        }
      : {
          label: mt.accessAskDoctor,
          dot: 'bg-amber-500',
          bg: 'bg-amber-50 border-amber-300 text-amber-950',
          icon: AlertTriangle,
        };

  const Icon = meta.icon;

  return (
    <div className={`rounded-2xl border p-3.5 flex items-center gap-3 ${meta.bg}`}>
      <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${meta.dot}`} />
      <div className="flex-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-75 block">
          {mt.whoCanGiveTitle}
        </span>
        <span className="text-sm font-black block">{meta.label}</span>
      </div>
      <Icon className="w-5 h-5 shrink-0 opacity-80" />
    </div>
  );
};
