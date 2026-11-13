import React, { useEffect, useState } from 'react';
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

  const steps = [
    t.processingStep1,
    t.processingStep2,
    t.processingStep3,
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/90 p-6 text-white backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl bg-slate-950 p-8 shadow-2xl border border-slate-800 text-center">
        {/* Animated Heartbeat & Radar Ring */}
        <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-teal-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-teal-500/30 animate-pulse" />
          <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-600 shadow-lg text-white">
            <HeartPulse className="h-9 w-9 animate-bounce" />
          </div>
        </div>

        <h3 className="text-xl font-black tracking-tight text-white mb-1">
          {customTitle || t.readingReport}
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          {customSubtitle || 'Keeping medical terms simple and clear'}
        </p>

        {/* Step Progress Checklist */}
        <div className="space-y-3 text-left">
          {steps.map((text, idx) => {
            const isDone = activeStep > idx;
            const isCurrent = activeStep === idx;
            return (
              <div
                key={idx}
                className={`flex items-center gap-3 rounded-xl p-2.5 transition-all ${
                  isCurrent
                    ? 'bg-teal-950/80 border border-teal-600/50 text-teal-200'
                    : isDone
                    ? 'text-slate-300'
                    : 'text-slate-600'
                }`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isDone
                      ? 'bg-teal-500 text-slate-950'
                      : isCurrent
                      ? 'bg-teal-600 text-white animate-pulse'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <span className="text-xs font-semibold">{text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
