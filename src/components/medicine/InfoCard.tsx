import React from 'react';
import { LucideIcon, Volume2, VolumeX } from 'lucide-react';
import { FieldSourceType } from '../../types/medicine';
import { SupportedLanguage } from '../../utils/translations';
import { medicineTranslations } from '../../utils/medicineTranslations';
import { speechService } from '../../utils/speech';

interface InfoCardProps {
  title: string;
  icon: LucideIcon;
  iconColorClass?: string;
  bgClass?: string;
  source?: FieldSourceType;
  language: SupportedLanguage;
  readAloudText?: string;
  activeSpeechId?: string | null;
  cardId: string;
  onSpeechToggle?: (cardId: string, text: string) => void;
  children: React.ReactNode;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  icon: Icon,
  iconColorClass = 'text-teal-800',
  bgClass = 'bg-white border-slate-200',
  source,
  language,
  readAloudText,
  activeSpeechId,
  cardId,
  onSpeechToggle,
  children,
}) => {
  const mt = medicineTranslations[language];
  const isSpeakingThis = activeSpeechId === cardId;

  const sourceBadge =
    source === 'printed_on_pack'
      ? { label: mt.sourcePrinted, cls: 'bg-slate-100 text-slate-700 border-slate-200' }
      : source === 'verified_database'
      ? { label: mt.sourceVerified, cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
      : source === 'not_verified'
      ? { label: mt.sourceNotVerified, cls: 'bg-amber-50 text-amber-800 border-amber-200' }
      : null;

  return (
    <div className={`rounded-2xl border p-4 shadow-xs ${bgClass}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${iconColorClass}`} />
          <h3 className={`text-xs font-black uppercase tracking-wide ${iconColorClass}`}>
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {sourceBadge && (
            <span
              className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${sourceBadge.cls}`}
            >
              {sourceBadge.label}
            </span>
          )}
          {readAloudText && speechService.isAvailable() && onSpeechToggle && (
            <button
              type="button"
              onClick={() => onSpeechToggle(cardId, readAloudText)}
              title={isSpeakingThis ? 'Stop' : 'Read Aloud'}
              className={`p-1.5 rounded-lg border transition active:scale-95 ${
                isSpeakingThis
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50 hover:text-teal-800'
              }`}
            >
              {isSpeakingThis ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
};
