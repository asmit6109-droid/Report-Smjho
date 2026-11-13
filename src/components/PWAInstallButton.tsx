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
        className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-800 transition active:scale-95"
      >
        <Download className="w-4 h-4" />
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
          className="inline-flex items-center gap-1.5 rounded-xl border border-teal-600 bg-white px-3 py-1.5 text-xs font-medium text-teal-800 shadow-sm hover:bg-teal-50 transition active:scale-95"
        >
          <Share2 className="w-3.5 h-3.5 text-teal-600" />
          <span>{t.installAppIos}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Install ReportSamjho</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-700 leading-relaxed">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-800 text-xs">
                    1
                  </span>
                  <p>
                    Tap the <strong>Share</strong> button <Share2 className="inline w-4 h-4 text-blue-600 align-text-bottom" /> at the bottom of Safari.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-800 text-xs">
                    2
                  </span>
                  <p>
                    Scroll down and tap <strong>Add to Home Screen</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-800 text-xs">
                    3
                  </span>
                  <p>
                    Tap <strong>Add</strong> in the top corner. Now ReportSamjho opens like a native app anytime!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-teal-700 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 transition"
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
