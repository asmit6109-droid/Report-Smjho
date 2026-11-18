import React, { useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { SupportedLanguage, translations } from '../utils/translations';

interface PWAInstallButtonProps {
  language: SupportedLanguage;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ language }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const t = translations[language];

  // If already running in standalone PWA mode, don't show prompt
  if (isInstalled) {
    return null;
  }

  // Chromium / Android flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="rs-btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-base font-bold"
      >
        <Download className="w-5 h-5" />
        <span>{t.installApp}</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 rounded-[14px] bg-[var(--color-brand-soft)] px-4 py-2.5 text-base font-bold text-[var(--color-brand)] hover:bg-[var(--color-divider)] transition"
        >
          <Share2 className="w-4 h-4" />
          <span>{t.installAppIos}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-text)]/50 p-4 backdrop-blur-xs">
            <div className="rs-card w-full max-w-sm p-6">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-divider)]">
                <h3 className="text-xl font-extrabold text-[var(--color-text)]">
                  Install ReportSamjho
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close"
                  className="rounded-full p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3.5 text-base text-[var(--color-text)] leading-relaxed">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)] font-bold text-[var(--color-brand)] text-base">
                    1
                  </span>
                  <p>
                    Tap the <strong>Share</strong> button <Share2 className="inline w-4 h-4 text-[var(--color-brand)] align-text-bottom" /> at the bottom of Safari.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)] font-bold text-[var(--color-brand)] text-base">
                    2
                  </span>
                  <p>
                    Scroll down and tap <strong>Add to Home Screen</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)] font-bold text-[var(--color-brand)] text-base">
                    3
                  </span>
                  <p>
                    Tap <strong>Add</strong> in the top corner. Now ReportSamjho opens like a native app anytime!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="rs-btn-primary mt-5 w-full py-3 text-base font-bold"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
