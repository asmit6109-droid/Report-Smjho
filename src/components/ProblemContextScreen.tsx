import React, { useRef, useState } from 'react';
import { SupportedLanguage } from '../utils/translations';
import { medicineTranslations } from '../utils/medicineTranslations';
import { compressImage } from '../utils/imageQuality';
import { isPdfFile, renderPdfToJpegPages } from '../utils/pdfUtils';
import {
  Thermometer,
  Activity,
  Wind,
  Droplets,
  HeartPulse,
  ShieldAlert,
  Utensils,
  HelpCircle,
  FilePlus2,
  X,
  ArrowLeft,
  ArrowRight,
  Check,
} from 'lucide-react';

interface ProblemContextScreenProps {
  language: SupportedLanguage;
  photoCount: number;
  onSubmit: (problem: string, docImages: string[]) => void;
  onBack: () => void;
}

export const ProblemContextScreen: React.FC<ProblemContextScreenProps> = ({
  language,
  photoCount,
  onSubmit,
  onBack,
}) => {
  const mt = medicineTranslations[language];
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [problemText, setProblemText] = useState<string>('');
  const [docImages, setDocImages] = useState<string[]>([]);
  const [isAttaching, setIsAttaching] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const chips = [
    { id: 'fever', label: mt.chipFever, icon: Thermometer },
    { id: 'pain', label: mt.chipPain, icon: Activity },
    { id: 'cold', label: mt.chipCold, icon: Wind },
    { id: 'sugar', label: mt.chipSugar, icon: Droplets },
    { id: 'bp', label: mt.chipBp, icon: HeartPulse },
    { id: 'infection', label: mt.chipInfection, icon: ShieldAlert },
    { id: 'stomach', label: mt.chipStomach, icon: Utensils },
    { id: 'other', label: mt.chipOther, icon: HelpCircle },
  ];

  const toggleChip = (label: string) => {
    setSelectedChips((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const handleAttachFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsAttaching(true);
    try {
      const files = Array.from(e.target.files).slice(0, 3 - docImages.length);
      for (const file of files) {
        if (isPdfFile(file)) {
          const pdfResult = await renderPdfToJpegPages(file, 3 - docImages.length, 1500, 0.7);
          if (pdfResult.pages.length > 0) {
            setDocImages((prev) => [...prev, ...pdfResult.pages].slice(0, 3));
          }
          continue;
        }
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve((ev.target?.result as string) || '');
          reader.readAsDataURL(file);
        });
        if (dataUrl) {
          const compressed = await compressImage(dataUrl, 1500, 0.7);
          setDocImages((prev) => [...prev, compressed]);
        }
      }
    } catch (err) {
      console.warn('Failed to attach prescription/report photo', err);
    } finally {
      setIsAttaching(false);
      e.target.value = '';
    }
  };

  const handleContinue = () => {
    const combinedParts = [...selectedChips];
    if (problemText.trim()) {
      combinedParts.push(problemText.trim());
    }
    onSubmit(combinedParts.join(', '), docImages);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={onBack}
          className="rs-card inline-flex items-center gap-2 px-4 py-2.5 text-base font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <span className="text-base font-bold text-[var(--color-brand)] bg-[var(--color-brand-soft)] px-4 py-1.5 rounded-full">
          {photoCount} {photoCount === 1 ? 'photo' : 'photos'} ready
        </span>
      </div>

      {/* Main Card */}
      <div className="rs-card p-6 space-y-5">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--color-text)] leading-snug">
            {mt.problemTitle}
          </h2>
          <p className="text-base text-[var(--color-text-secondary)] mt-1 font-medium leading-relaxed">
            {mt.problemSubtitle}
          </p>
        </div>

        {/* Quick-Pick Icon Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {chips.map((chip) => {
            const Icon = chip.icon;
            const active = selectedChips.includes(chip.label);
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => toggleChip(chip.label)}
                className={`flex items-center gap-2 rounded-[14px] p-3 text-left text-base font-bold transition ${
                  active
                    ? 'bg-[var(--color-brand)] text-white shadow-[var(--shadow-card)]'
                    : 'bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="truncate">{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* Optional Text Box */}
        <div>
          <textarea
            rows={2}
            value={problemText}
            onChange={(e) => setProblemText(e.target.value)}
            placeholder={mt.problemPlaceholder}
            className="w-full rounded-[14px] bg-[var(--color-bg)] px-4 py-3 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-2 focus:outline-[var(--color-brand)]"
          />
        </div>

        {/* Optional Prescription / Report Attach */}
        <div className="rounded-[14px] bg-[var(--color-bg)] p-4">
          <button
            type="button"
            disabled={isAttaching || docImages.length >= 3}
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 text-base font-bold text-[var(--color-brand)] disabled:opacity-50 py-1"
          >
            <FilePlus2 className="w-5 h-5 shrink-0" />
            <span>{mt.attachDocBtn}</span>
          </button>

          {docImages.length > 0 && (
            <div className="mt-3 flex items-center gap-3 overflow-x-auto pt-1">
              {docImages.map((img, i) => (
                <div key={i} className="relative shrink-0">
                  <img
                    src={img}
                    alt={`Attached ${i + 1}`}
                    className="w-16 h-16 object-cover rounded-[12px] border-2 border-[var(--color-brand)]"
                  />
                  <button
                    type="button"
                    onClick={() => setDocImages((prev) => prev.filter((_, idx) => idx !== i))}
                    style={{ minHeight: '24px' }}
                    className="absolute -top-1.5 -right-1.5 bg-[var(--color-text)] text-white rounded-full p-0.5"
                    aria-label="Remove attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <span className="mt-1 flex items-center justify-center gap-1 text-sm font-bold text-[var(--color-brand)]">
                    <Check className="w-3.5 h-3.5" />
                    {mt.docAttached}
                  </span>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={handleAttachFiles}
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3 pt-1">
          <button
            type="button"
            onClick={() => onSubmit('', [])}
            className="col-span-1 rounded-[14px] bg-[var(--color-surface-subtle)] py-3.5 text-base font-bold text-[var(--color-text)] hover:bg-[var(--color-divider)] transition"
          >
            {mt.skipBtn}
          </button>

          <button
            type="button"
            onClick={handleContinue}
            className="rs-btn-primary col-span-2 flex items-center justify-center gap-2 py-3.5 px-4 text-base font-extrabold"
          >
            <span>{mt.continueBtn}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
