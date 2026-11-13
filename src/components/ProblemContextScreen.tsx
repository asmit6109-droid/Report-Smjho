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
          const pdfPages = await renderPdfToJpegPages(file, 3 - docImages.length);
          if (pdfPages.length > 0) {
            setDocImages((prev) => [...prev, ...pdfPages].slice(0, 3));
          }
          continue;
        }
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve((ev.target?.result as string) || '');
          reader.readAsDataURL(file);
        });
        if (dataUrl) {
          const compressed = await compressImage(dataUrl, 960, 0.7);
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
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 shadow-xs hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
          {photoCount} {photoCount === 1 ? 'photo' : 'photos'} ready
        </span>
      </div>

      {/* Main Card */}
      <div className="rounded-3xl bg-white p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
        <div>
          <h2 className="text-xl font-black text-slate-900 leading-snug">
            {mt.problemTitle}
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">
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
                className={`flex items-center gap-2 rounded-2xl p-3 text-left text-xs font-bold border-2 transition active:scale-95 ${
                  active
                    ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-xs'
                    : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-teal-700' : 'text-slate-500'
                  }`}
                />
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
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none transition"
          />
        </div>

        {/* Optional Prescription / Report Attach */}
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-3.5">
          <button
            type="button"
            disabled={isAttaching || docImages.length >= 3}
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 text-xs font-bold text-teal-800 hover:text-teal-900 disabled:opacity-50 py-1"
          >
            <FilePlus2 className="w-4 h-4 text-teal-700 shrink-0" />
            <span>{mt.attachDocBtn}</span>
          </button>

          {docImages.length > 0 && (
            <div className="mt-3 flex items-center gap-2.5 overflow-x-auto pt-1">
              {docImages.map((img, i) => (
                <div key={i} className="relative shrink-0">
                  <img
                    src={img}
                    alt={`Attached ${i + 1}`}
                    className="w-14 h-14 object-cover rounded-xl border border-teal-400"
                  />
                  <button
                    type="button"
                    onClick={() => setDocImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <span className="mt-1 flex items-center justify-center gap-0.5 text-[10px] font-bold text-emerald-700">
                    <Check className="w-3 h-3" />
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
            className="col-span-1 rounded-2xl border border-slate-200 bg-slate-100 py-3.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition active:scale-98"
          >
            {mt.skipBtn}
          </button>

          <button
            type="button"
            onClick={handleContinue}
            className="col-span-2 flex items-center justify-center gap-2 rounded-2xl bg-teal-700 py-3.5 px-4 text-sm font-extrabold text-white shadow-md hover:bg-teal-800 transition active:scale-98"
          >
            <span>{mt.continueBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
