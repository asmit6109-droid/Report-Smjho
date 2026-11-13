import React, { useState } from 'react';
import { MedicineStep1Result } from '../../types/medicine';
import { SupportedLanguage } from '../../utils/translations';
import { medicineTranslations } from '../../utils/medicineTranslations';
import { ConfidenceBadge } from './ConfidenceBadge';
import { ArrowLeft, Check, Edit3, Pill, AlertTriangle } from 'lucide-react';

interface MedicineConfirmScreenProps {
  language: SupportedLanguage;
  step1Result: MedicineStep1Result;
  packThumbnail?: string;
  isManualMode?: boolean;
  onConfirm: (confirmed: MedicineStep1Result) => void;
  onRetake: () => void;
}

export const MedicineConfirmScreen: React.FC<MedicineConfirmScreenProps> = ({
  language,
  step1Result,
  packThumbnail,
  isManualMode = false,
  onConfirm,
  onRetake,
}) => {
  const mt = medicineTranslations[language];
  const [brand, setBrand] = useState(step1Result.medicine.brand || '');
  const [salt, setSalt] = useState(step1Result.medicine.salt || '');
  const [strength, setStrength] = useState(step1Result.medicine.strength || '');
  const [isEditing, setIsEditing] = useState(
    isManualMode || step1Result.confidence !== 'high' || !step1Result.medicine.salt
  );

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim() && !salt.trim()) return;
    onConfirm({
      ...step1Result,
      medicine: {
        ...step1Result.medicine,
        brand: brand.trim() || salt.trim(),
        salt: salt.trim() || null,
        strength: strength.trim() || null,
      },
    });
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onRetake}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 shadow-xs hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retake</span>
        </button>

        <ConfidenceBadge confidence={step1Result.confidence} language={language} />
      </div>

      <form
        onSubmit={handleConfirm}
        className="rounded-3xl bg-white p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4"
      >
        <div className="flex items-start gap-3.5">
          {packThumbnail ? (
            <img
              src={packThumbnail}
              alt="Scanned medicine pack"
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <Pill className="w-7 h-7" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-snug">
              {isManualMode ? mt.manualEntryBtn : mt.confirmMedTitle}
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              {mt.confirmMedSubtitle}
            </p>
          </div>
        </div>

        {step1Result.confidence !== 'high' && !isManualMode && (
          <div className="rounded-2xl bg-amber-50 border border-amber-300 p-3 flex items-start gap-2 text-xs font-bold text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              Pack text was not 100% clear. Please check or fix the name and salt below.
            </span>
          </div>
        )}

        {!isEditing ? (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                {mt.brandLabel}
              </span>
              <span className="text-base font-black text-slate-900">{brand}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                {mt.saltLabel}
              </span>
              <span className="text-sm font-bold text-teal-800">
                {salt || 'Not clearly printed'}
              </span>
            </div>
            {strength && (
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  {mt.strengthLabel}
                </span>
                <span className="text-xs font-bold text-slate-700">{strength}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:underline"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit name or salt</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                {mt.brandLabel}
              </label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Dolo 650"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                {mt.saltLabel}
              </label>
              <input
                type="text"
                value={salt}
                onChange={(e) => setSalt(e.target.value)}
                placeholder="e.g. Paracetamol"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                {mt.strengthLabel}
              </label>
              <input
                type="text"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                placeholder="e.g. 650 mg"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-teal-700 py-3.5 px-4 text-sm font-extrabold text-white shadow-md hover:bg-teal-800 transition active:scale-98"
        >
          <Check className="w-4 h-4" />
          <span>{mt.confirmAndCheckBtn}</span>
        </button>
      </form>
    </div>
  );
};
