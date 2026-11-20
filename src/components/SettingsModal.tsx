import React, { useState } from 'react';
import { SupportedLanguage, translations } from '../utils/translations';
import { medicineTranslations } from '../utils/medicineTranslations';
import { UserProfile } from '../types/report';
import { UserHealthProfile } from '../types/medicine';
import { clearAllLocalData } from '../utils/storage';
import { clearAllCaches, getCacheStats } from '../utils/cache';
import { getThumbsDownTopics } from '../utils/feedbackStorage';
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
  ChevronDown,
  Info,
  DatabaseZap,
  ThumbsDown,
  Check,
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
  onOpenAboutCredits: () => void;
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
  onOpenAboutCredits,
  onDataReset,
  onClose,
}) => {
  const t = translations[language];
  const mt = medicineTranslations[language];
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cacheCount, setCacheCount] = useState(() => getCacheStats().totalCount);
  const [cacheClearedMsg, setCacheClearedMsg] = useState(false);
  const [showFeedbackList, setShowFeedbackList] = useState(false);
  const thumbsDownTopics = getThumbsDownTopics();

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

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAboutCredits();
            }}
            className="w-full flex items-center justify-between py-3 px-3 rounded-[12px] hover:bg-[var(--color-bg)] text-left transition"
          >
            <div className="flex items-center gap-3 text-base font-semibold text-[var(--color-text)]">
              <Info className="w-5 h-5 text-[var(--color-brand)]" />
              <span>
                {language === 'hi'
                  ? 'ऐप के बारे में / क्रेडिट्स'
                  : language === 'or'
                  ? 'ଆପ୍ ବିଷୟରେ / କ୍ରେଡିଟ୍ସ'
                  : 'About / Credits'}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>

          <div className="pt-2 flex justify-start">
            <PWAInstallButton language={language} />
          </div>
        </div>

        {/* Cache Clearing (keeps saved reports & medicines) + Clarity Feedback Review */}
        <div className="space-y-2.5 pt-2 border-t border-[var(--color-divider)]">
          <button
            type="button"
            onClick={() => {
              clearAllCaches();
              setCacheCount(0);
              setCacheClearedMsg(true);
              setTimeout(() => setCacheClearedMsg(false), 2500);
            }}
            className="w-full flex items-center justify-between py-3 px-3.5 rounded-[12px] bg-[var(--color-bg)] hover:bg-[var(--color-surface-subtle)] text-left transition"
          >
            <div className="flex items-center gap-3 min-w-0">
              {cacheClearedMsg ? (
                <Check className="w-5 h-5 text-[var(--color-normal)] shrink-0" />
              ) : (
                <DatabaseZap className="w-5 h-5 text-[var(--color-brand)] shrink-0" />
              )}
              <div className="min-w-0">
                <span className="text-base font-semibold text-[var(--color-text)] block">
                  {cacheClearedMsg
                    ? language === 'hi'
                      ? 'कैश साफ हो गया'
                      : language === 'or'
                      ? 'କ୍ୟାସ୍ ସଫା ହୋଇଗଲା'
                      : 'Cache cleared'
                    : language === 'hi'
                    ? 'सेव किया गया कैश साफ करें'
                    : language === 'or'
                    ? 'ସେଭ୍ ହୋଇଥିବା କ୍ୟାସ୍ ସଫା କରନ୍ତୁ'
                    : 'Clear cached scans & explanations'}
                </span>
                <span className="text-xs text-[var(--color-text-secondary)] block">
                  {language === 'hi'
                    ? 'आपकी सेव रिपोर्ट और दवाइयां सुरक्षित रहेंगी'
                    : language === 'or'
                    ? 'ଆପଣଙ୍କ ସେଭ୍ ରିପୋର୍ଟ ଓ ଔଷଧ ସୁରକ୍ଷିତ ରହିବ'
                    : 'Keeps all your saved reports & medicines'}
                </span>
              </div>
            </div>
            <span className="text-xs font-extrabold text-[var(--color-text-secondary)] shrink-0 ml-2">
              {cacheCount}
            </span>
          </button>

          {/* Explanation Clarity Feedback Debug View */}
          <div>
            <button
              type="button"
              onClick={() => setShowFeedbackList((p) => !p)}
              className="w-full flex items-center justify-between py-2.5 px-3 rounded-[12px] hover:bg-[var(--color-bg)] text-left transition"
            >
              <div className="flex items-center gap-2.5 text-sm font-semibold text-[var(--color-text-secondary)]">
                <ThumbsDown className="w-4 h-4 shrink-0" />
                <span>
                  {language === 'hi'
                    ? 'अस्पष्ट समझाई गई जांच सूची'
                    : language === 'or'
                    ? 'ଅସ୍ପଷ୍ଟ ବୁଝାଯାଇଥିବା ତାଲିକା'
                    : 'Topics marked unclear'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[var(--color-text-secondary)]">
                  {thumbsDownTopics.length}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-[var(--color-text-secondary)] transition ${
                    showFeedbackList ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>
            {showFeedbackList && (
              <div className="mt-1.5 rounded-[12px] bg-[var(--color-bg)] px-3.5 py-2.5 space-y-1.5 text-xs">
                {thumbsDownTopics.length === 0 ? (
                  <p className="text-[var(--color-text-secondary)]">
                    {language === 'hi'
                      ? 'अभी तक किसी जांच पर डाउन-वोट नहीं है।'
                      : language === 'or'
                      ? 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଅସ୍ପଷ୍ଟ ଭୋଟ୍ ନାହିଁ।'
                      : 'No topics marked unclear yet.'}
                  </p>
                ) : (
                  thumbsDownTopics.map((item) => (
                    <div
                      key={item.topicId}
                      className="flex items-center justify-between gap-2 text-[var(--color-text)]"
                    >
                      <span className="font-bold truncate">{item.topicLabel}</span>
                      <span className="text-[var(--color-text-secondary)] shrink-0">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
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
