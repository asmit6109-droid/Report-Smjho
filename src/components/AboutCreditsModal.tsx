import React from 'react';
import { SupportedLanguage } from '../utils/translations';
import { X, Info, BookOpen, ShieldCheck, Layers } from 'lucide-react';

interface AboutCreditsModalProps {
  language: SupportedLanguage;
  onClose: () => void;
}

export const AboutCreditsModal: React.FC<AboutCreditsModalProps> = ({
  language,
  onClose,
}) => {
  const title =
    language === 'hi'
      ? 'ऐप के बारे में / क्रेडिट्स'
      : language === 'or'
      ? 'ଆପ୍ ବିଷୟରେ / କ୍ରେଡିଟ୍ସ'
      : 'About & Credits';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--color-text)]/50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="rs-card w-full sm:max-w-md rounded-b-none sm:rounded-[16px] p-6 max-h-[90vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-divider)]">
          <div className="flex items-center gap-2.5">
            <Info className="w-5 h-5 text-[var(--color-brand)] shrink-0" />
            <h3 className="text-xl font-extrabold text-[var(--color-text)]">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close About and Credits"
            className="p-2 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* App Overview */}
        <div className="rounded-[14px] bg-[var(--color-brand-soft)]/50 p-4 space-y-1">
          <p className="text-lg font-extrabold text-[var(--color-text)]">ReportSamjho</p>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">
            {language === 'hi'
              ? 'सरल स्वास्थ्य रिपोर्ट और दवा जानकारी सहायक • Asmit द्वारा निर्मित'
              : language === 'or'
              ? 'ସରଳ ସ୍ୱାସ୍ଥ୍ୟ ରିପୋର୍ଟ ଏବଂ ଔଷଧ ସୂଚନା ସହାୟକ • Asmit ଙ୍କ ଦ୍ୱାରା ନିର୍ମିତ'
              : 'Simple visual health report & medicine helper • Built by Asmit'}
          </p>
        </div>

        {/* Icon Library & Bundled Assets */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[var(--color-brand)]">
            <Layers className="w-4 h-4 shrink-0" />
            <span>
              {language === 'hi'
                ? 'आइकन और विज़ुअल लाइसेंस'
                : language === 'or'
                ? 'ଆଇକନ୍ ଏବଂ ଭିଜୁଆଲ୍ ଲାଇସେନ୍ସ'
                : 'Icons, Fonts & Static Visuals'}
            </span>
          </div>

          <div className="rounded-[14px] bg-[var(--color-bg)] p-4 space-y-3 text-sm text-[var(--color-text)]">
            <div>
              <p className="font-bold">Lucide Icons (lucide-react)</p>
              <p className="text-[var(--color-text-secondary)]">
                License: ISC License (lucide.dev). Used for category, navigation, and status line icons.
              </p>
            </div>

            <div className="pt-2 border-t border-[var(--color-divider)]">
              <p className="font-bold">
                Noto Sans, Noto Sans Devanagari & Noto Sans Oriya
              </p>
              <p className="text-[var(--color-text-secondary)]">
                License: SIL Open Font License (OFL 1.1). Bundled locally for offline English, Hindi, and Odia PDF exports.
              </p>
            </div>

            <div className="pt-2 border-t border-[var(--color-divider)]">
              <p className="font-bold">ReportSamjho Body & Visual SVGs</p>
              <p className="text-[var(--color-text-secondary)]">
                Static local inline vector silhouettes bundled directly inside the app for instant offline loading (no external image URLs).
              </p>
            </div>
          </div>
        </div>

        {/* Medical Data References & Attribution Policy */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[var(--color-brand)]">
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>
              {language === 'hi'
                ? 'डेटा स्रोत और थर्ड-पार्टी नीति'
                : language === 'or'
                ? 'ତଥ୍ୟ ଉତ୍ସ ଏବଂ ଥାର୍ଡ-ପାର୍ଟି ନୀତି'
                : 'Reference Data & Third-Party Assets'}
            </span>
          </div>

          <div className="rounded-[14px] bg-[var(--color-bg)] p-4 space-y-3 text-sm text-[var(--color-text)]">
            <div>
              <p className="font-bold">openFDA & RxNorm</p>
              <p className="text-[var(--color-text-secondary)]">
                Public drug fact lookup sources (U.S. FDA / National Library of Medicine) used during medicine verification.
              </p>
            </div>

            <div className="pt-2 border-t border-[var(--color-divider)]">
              <p className="font-bold">Third-Party Medical Illustrations Policy</p>
              <p className="text-[var(--color-text-secondary)]">
                No external third-party anatomical artwork is currently used. If third-party illustrations are added in future updates (for example Servier Medical Art, CC BY 4.0), their required attribution and verified license terms will be listed here.
              </p>
            </div>
          </div>
        </div>

        {/* Safety Note */}
        <div className="flex items-start gap-2.5 rounded-[14px] bg-[var(--color-surface-subtle)] p-3.5 text-xs text-[var(--color-text-secondary)]">
          <ShieldCheck className="w-4 h-4 text-[var(--color-brand)] shrink-0 mt-0.5" />
          <span>
            This app provides general health education only and does not replace a registered doctor or pharmacist.
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rs-btn-primary w-full py-3.5 text-base font-extrabold"
        >
          Close
        </button>
      </div>
    </div>
  );
};
