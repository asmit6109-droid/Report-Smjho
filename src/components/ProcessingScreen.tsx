import React, { useState, useEffect } from 'react';
import { SupportedLanguage, translations } from '../utils/translations';
import { HeartPulse, Check } from 'lucide-react';

interface ProcessingScreenProps {
  language: SupportedLanguage;
  customTitle?: string;
  customSubtitle?: string;
}

export const ProcessingScreen: React.FC<ProcessingScreenProps> = ({
  language,
  customTitle,
  customSubtitle,
}) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const t = translations[language];

  useEffect(() => {
    const timer1 = setTimeout(() => setActiveStep(1), 1800);
    const timer2 = setTimeout(() => setActiveStep(2), 3800);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const steps = [t.processingStep1, t.processingStep2, t.processingStep3];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-bg)]/95 p-6">
      <div className="rs-card w-full max-w-sm p-8 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[16px] bg-[var(--color-brand)] text-white shadow-[var(--shadow-card)]">
          <HeartPulse className="h-9 w-9" />
        </div>

        <div>
          <h3 className="text-xl font-extrabold text-[var(--color-text)]">
            {customTitle || t.readingReport}
          </h3>
          {customSubtitle && (
            <p className="text-base text-[var(--color-text-secondary)] mt-1">{customSubtitle}</p>
          )}
        </div>

        <div className="space-y-2.5 text-left">
          {steps.map((text, idx) => {
            const isDone = activeStep > idx;
            const isCurrent = activeStep === idx;
            return (
              <div
                key={idx}
                className={`flex items-center gap-3 rounded-[12px] p-3 transition ${
                  isCurrent
                    ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
                    : isDone
                    ? 'text-[var(--color-text)]'
                    : 'text-[var(--color-text-secondary)]'
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                    isDone || isCurrent
                      ? 'bg-[var(--color-brand)] text-white'
                      : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                <span className="text-base font-bold">{text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
