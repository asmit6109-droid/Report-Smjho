import React, { useState } from 'react';
import { MedicineStep1Result } from '../../types/medicine';
import { SupportedLanguage } from '../../utils/translations';
import { medicineTranslations } from '../../utils/medicineTranslations';
import { ArrowLeft, Check, Edit3, AlertTriangle } from 'lucide-react';

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
  const [isEditing, setIsEditing] = useState(isManualMode);

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

  const titleText =
    language === 'hi'
      ? 'क्या यह सही है?'
      : language === 'or'
      ? 'ଏହା ଠିକ୍ ଅଛି କି?'
      : 'Is this correct?';

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <button
        type="button"
        onClick={onRetake}
        className="rs-card inline-flex items-center gap-2 px-4 py-2.5 text-base font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] transition"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Retake</span>
      </button>

      <form onSubmit={handleConfirm} className="rs-card p-6 space-y-5">
        {/* Single line heading */}
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-6 h-6 text-[var(--color-caution)] shrink-0" />
          <h2 className="text-xl font-extrabold text-[var(--color-text)]">
            {isManualMode ? mt.manualEntryBtn : titleText}
          </h2>
        </div>

        {/* Detected Name, Salt, Strength */}
        {!isEditing ? (
          <div className="flex items-center gap-4">
            {packThumbnail && (
              <img
                src={packThumbnail}
                alt="Medicine pack"
                className="w-16 h-16 rounded-[14px] object-cover shrink-0"
              />
            )}
            <div className="min-w-0">
              <p className="text-xl font-extrabold text-[var(--color-text)] truncate">
                {brand || 'Unknown'} {strength ? `• ${strength}` : ''}
              </p>
              <p className="text-base font-semibold text-[var(--color-brand)] truncate mt-0.5">
                {salt || 'Salt not clear'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              required
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder={mt.brandLabel}
              className="w-full rounded-[12px] bg-[var(--color-bg)] px-4 py-3 text-base font-bold text-[var(--color-text)] focus:outline-2 focus:outline-[var(--color-brand)]"
            />
            <input
              type="text"
              value={salt}
              onChange={(e) => setSalt(e.target.value)}
              placeholder={mt.saltLabel}
              className="w-full rounded-[12px] bg-[var(--color-bg)] px-4 py-3 text-base font-semibold text-[var(--color-text)] focus:outline-2 focus:outline-[var(--color-brand)]"
            />
            <input
              type="text"
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
              placeholder={mt.strengthLabel}
              className="w-full rounded-[12px] bg-[var(--color-bg)] px-4 py-3 text-base font-semibold text-[var(--color-text)] focus:outline-2 focus:outline-[var(--color-brand)]"
            />
          </div>
        )}

        {/* Yes / Edit Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center justify-center gap-2 rounded-[14px] bg-[var(--color-surface-subtle)] py-3.5 text-base font-bold text-[var(--color-text)] hover:bg-[var(--color-divider)] transition"
            >
              <Edit3 className="w-5 h-5" />
              <span>{language === 'hi' ? 'बदलें' : language === 'or' ? 'ବଦଳାନ୍ତୁ' : 'Edit'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onRetake}
              className="rounded-[14px] bg-[var(--color-surface-subtle)] py-3.5 text-base font-bold text-[var(--color-text)]"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            className="rs-btn-primary flex items-center justify-center gap-2 py-3.5 text-base font-extrabold"
          >
            <Check className="w-5 h-5" />
            <span>{language === 'hi' ? 'हाँ' : language === 'or' ? 'ହଁ' : 'Yes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
