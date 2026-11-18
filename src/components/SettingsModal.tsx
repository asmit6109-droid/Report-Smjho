import React, { useState } from 'react';
import { SupportedLanguage, translations } from '../utils/translations';
import { medicineTranslations } from '../utils/medicineTranslations';
import { UserProfile } from '../types/report';
import { UserHealthProfile } from '../types/medicine';
import { clearAllLocalData } from '../utils/storage';
import {
  X,
  Languages,
  User,
  ShieldCheck,
  Trash2,
  ClipboardList,
  FileText,
  Pill,
  ChevronRight,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsModalProps {
  language: SupportedLanguage;
  profile: UserProfile;
  healthProfile: UserHealthProfile;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onOpenHealthProfile: () => void;
  onOpenPrescriptionScan: () => void;
  onOpenDemoReport: () => void;
  onOpenDemoMedicine: () => void;
  onDataReset: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  language,
  profile,
  healthProfile,
  onLanguageChange,
  onOpenHealthProfile,
  onOpenPrescriptionScan,
  onOpenDemoReport,
  onOpenDemoMedicine,
  onDataReset,
  onClose,
}) => {
  const t = translations[language];
  const mt = medicineTranslations[language];
  const [confirmDelete, setConfirmDelete] = useState(false);

  const profileSummary = [
    profile.age ? `${profile.age}y` : '',
    ...healthProfile.allergies,
    ...healthProfile.conditions,
  ]
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');

  const handleConfirmDelete = () => {
    clearAllLocalData();
    setConfirmDelete(false);
    onDataReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--color-text)]/50 p-4">
      <div className="rs-card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-divider)]">
          <h3 className="text-xl font-extrabold text-[var(--color-text)]">
            {language === 'hi' ? 'सेटिंग्स' : language === 'or' ? 'ସେଟିଂସ୍' : 'Settings'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-2 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Selector */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-base font-bold text-[var(--color-text-secondary)]">
            <Languages className="w-5 h-5 text-[var(--color-brand)]" />
            <span>
              {language === 'hi' ? 'भाषा' : language === 'or' ? 'ଭାଷା' : 'Language'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { code: 'en', label: 'English' },
                { code: 'hi', label: 'हिन्दी' },
                { code: 'or', label: 'ଓଡ଼ିଆ' },
              ] as const
            ).map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => onLanguageChange(item.code)}
                className={`py-2.5 rounded-[12px] text-base font-extrabold transition ${
                  language === item.code
                    ? 'bg-[var(--color-brand)] text-white shadow-[var(--shadow-card)]'
                    : 'bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Health Profile */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenHealthProfile();
          }}
          className="w-full flex items-center justify-between py-3.5 px-4 rounded-[14px] bg-[var(--color-bg)] hover:bg-[var(--color-brand-soft)] text-left transition"
        >
          <div className="flex items-center gap-3 min-w-0">
            <User className="w-5 h-5 text-[var(--color-brand)] shrink-0" />
            <div className="min-w-0">
              <span className="text-base font-bold text-[var(--color-text)] block">
                {language === 'hi'
                  ? 'स्वास्थ्य प्रोफाइल'
                  : language === 'or'
                  ? 'ସ୍ୱାସ୍ଥ୍ୟ ପ୍ରୋଫାଇଲ୍'
                  : 'Health Profile'}
              </span>
              {profileSummary && (
                <span className="text-sm text-[var(--color-text-secondary)] truncate block">
                  {profileSummary}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)] shrink-0" />
        </button>

        {/* More Tools (Prescription & Demos) */}
        <div className="space-y-1.5 pt-2 border-t border-[var(--color-divider)]">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenPrescriptionScan();
            }}
            className="w-full flex items-center justify-between py-3 px-3 rounded-[12px] hover:bg-[var(--color-bg)] text-left transition"
          >
            <div className="flex items-center gap-3 text-base font-semibold text-[var(--color-text)]">
              <ClipboardList className="w-5 h-5 text-[var(--color-brand)]" />
              <span>{mt.scanPrescriptionBtn}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDemoReport();
            }}
            className="w-full flex items-center justify-between py-3 px-3 rounded-[12px] hover:bg-[var(--color-bg)] text-left transition"
          >
            <div className="flex items-center gap-3 text-base font-semibold text-[var(--color-text)]">
              <FileText className="w-5 h-5 text-[var(--color-brand)]" />
              <span>{t.demoReportBtn}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDemoMedicine();
            }}
            className="w-full flex items-center justify-between py-3 px-3 rounded-[12px] hover:bg-[var(--color-bg)] text-left transition"
          >
            <div className="flex items-center gap-3 text-base font-semibold text-[var(--color-text)]">
              <Pill className="w-5 h-5 text-[var(--color-brand)]" />
              <span>{mt.tryDemoMedicineBtn}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>

          <div className="pt-2 flex justify-start">
            <PWAInstallButton language={language} />
          </div>
        </div>

        {/* Privacy Note */}
        <div className="flex items-start gap-3 rounded-[14px] bg-[var(--color-bg)] p-4 text-base text-[var(--color-text-secondary)]">
          <ShieldCheck className="w-5 h-5 text-[var(--color-brand)] shrink-0 mt-0.5" />
          <span>{t.privacyNote}</span>
        </div>

        {/* Delete All Data (neutral surface unless confirming destructive action) */}
        <div className="pt-2 border-t border-[var(--color-divider)]">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-2 rounded-[14px] bg-[var(--color-surface-subtle)] py-3.5 text-base font-bold text-[var(--color-text)] hover:bg-[var(--color-divider)] transition"
            >
              <Trash2 className="w-5 h-5 text-[var(--color-text-secondary)]" />
              <span>{t.deleteDataBtn}</span>
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-base font-semibold text-[var(--color-text)] text-center">
                {t.deleteDataConfirm}
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-[12px] bg-[var(--color-surface-subtle)] py-3 text-base font-bold text-[var(--color-text)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="rounded-[12px] bg-[var(--color-text)] py-3 text-base font-bold text-white"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
