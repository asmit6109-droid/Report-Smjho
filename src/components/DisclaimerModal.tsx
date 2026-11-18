import React, { useState } from 'react';
import { SupportedLanguage, translations } from '../utils/translations';
import { UserProfile } from '../types/report';
import { ShieldAlert, CheckCircle, HeartPulse, User } from 'lucide-react';

interface DisclaimerModalProps {
  initialLanguage: SupportedLanguage;
  onComplete: (profile: UserProfile) => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({
  initialLanguage,
  onComplete,
}) => {
  const [step, setStep] = useState<'disclaimer' | 'profile'>('disclaimer');
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(initialLanguage);
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const t = translations[selectedLang];

  const handleAcceptDisclaimer = () => {
    setStep('profile');
  };

  const handleFinishProfile = () => {
    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      setErrorMsg(
        selectedLang === 'hi'
          ? 'कृपया सही उम्र दर्ज करें (1 से 120 वर्ष)'
          : selectedLang === 'or'
          ? 'ଦୟାକରି ସଠିକ୍ ବୟସ ପ୍ରବେଶ କରନ୍ତୁ'
          : 'Please enter a valid age between 1 and 120 years'
      );
      return;
    }
    if (!gender) {
      setErrorMsg(
        selectedLang === 'hi'
          ? 'कृपया अपना लिंग चुनें'
          : selectedLang === 'or'
          ? 'ଦୟାକରି ଲିଙ୍ଗ ଚୟନ କରନ୍ତୁ'
          : 'Please select your gender'
      );
      return;
    }

    const profile: UserProfile = {
      disclaimerAccepted: true,
      age: ageNum,
      gender,
      language: selectedLang,
    };
    onComplete(profile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-text)]/55 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="rs-card w-full max-w-md p-6 my-auto">
        {/* Language switcher selector at the top */}
        <div className="flex justify-end gap-1.5 mb-4">
          {(
            [
              { code: 'en', label: 'English' },
              { code: 'hi', label: 'हिन्दी' },
              { code: 'or', label: 'ଓଡ଼ିଆ' },
            ] as const
          ).map((langOpt) => (
            <button
              key={langOpt.code}
              type="button"
              onClick={() => setSelectedLang(langOpt.code)}
              className={`px-3.5 py-1.5 rounded-full text-base font-bold transition ${
                selectedLang === langOpt.code
                  ? 'bg-[var(--color-brand)] text-white shadow-[var(--shadow-card)]'
                  : 'bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]'
              }`}
            >
              {langOpt.label}
            </button>
          ))}
        </div>

        {step === 'disclaimer' ? (
          <div>
            {/* Header Icon */}
            <div className="flex justify-center mb-3">
              <div className="h-16 w-16 rounded-[16px] bg-[var(--color-brand-soft)] flex items-center justify-center text-[var(--color-brand)]">
                <HeartPulse className="w-9 h-9" />
              </div>
            </div>

            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-base font-bold bg-[var(--color-brand-soft)] text-[var(--color-brand)] mb-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                {t.disclaimerTitle}
              </span>
              <h2 className="text-2xl font-extrabold text-[var(--color-text)] leading-snug">
                {t.appName}
              </h2>
              <p className="mt-3 text-base text-[var(--color-text)] font-medium leading-relaxed bg-[var(--color-bg)] p-4 rounded-[14px]">
                {t.disclaimerNotice}
              </p>
            </div>

            {/* Clear bullet points */}
            <div className="mt-5 space-y-3 text-base text-[var(--color-text)]">
              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-5 h-5 text-[var(--color-brand)] shrink-0 mt-0.5" />
                <span>{t.disclaimerBullet1}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-5 h-5 text-[var(--color-brand)] shrink-0 mt-0.5" />
                <span>{t.disclaimerBullet2}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-5 h-5 text-[var(--color-brand)] shrink-0 mt-0.5" />
                <span className="font-bold">{t.disclaimerBullet3}</span>
              </div>
            </div>

            {/* Accept Button */}
            <button
              type="button"
              onClick={handleAcceptDisclaimer}
              className="rs-btn-primary mt-6 w-full py-3.5 text-lg font-bold"
            >
              {t.acceptAndContinue}
            </button>
          </div>
        ) : (
          <div>
            {/* Step 2: Age and Gender */}
            <div className="flex justify-center mb-3">
              <div className="h-14 w-14 rounded-[16px] bg-[var(--color-brand-soft)] flex items-center justify-center text-[var(--color-brand)]">
                <User className="w-7 h-7" />
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-xl font-extrabold text-[var(--color-text)] leading-snug">
                {t.setupProfileTitle}
              </h2>
              <p className="mt-1 text-base text-[var(--color-text-secondary)]">
                {t.setupProfileSub}
              </p>
            </div>

            {errorMsg && (
              <div className="mt-3 rounded-[12px] bg-[var(--color-danger-soft)] p-3 text-base font-semibold text-[var(--color-danger)] text-center">
                {errorMsg}
              </div>
            )}

            <div className="mt-5 space-y-4">
              {/* Age Input */}
              <div>
                <label className="block text-base font-bold text-[var(--color-text)] mb-1.5">
                  {t.ageLabel}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="120"
                  value={age}
                  onChange={(e) => {
                    setAge(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder={t.agePlaceholder}
                  className="w-full rounded-[14px] bg-[var(--color-bg)] px-4 py-3 text-xl font-bold text-[var(--color-text)] focus:outline-2 focus:outline-[var(--color-brand)]"
                />
              </div>

              {/* Gender Radio Choices */}
              <div>
                <label className="block text-base font-bold text-[var(--color-text)] mb-1.5">
                  {t.genderLabel}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'male', label: t.genderMale },
                      { id: 'female', label: t.genderFemale },
                      { id: 'other', label: t.genderOther },
                    ] as const
                  ).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setGender(g.id);
                        setErrorMsg('');
                      }}
                      className={`rounded-[14px] py-3 px-2 flex flex-col items-center justify-center gap-1 text-base font-bold transition ${
                        gender === g.id
                          ? 'bg-[var(--color-brand)] text-white shadow-[var(--shadow-card)]'
                          : 'bg-[var(--color-bg)] text-[var(--color-text)]'
                      }`}
                    >
                      <User className="w-5 h-5" />
                      <span>{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Save Profile Button */}
            <button
              type="button"
              onClick={handleFinishProfile}
              className="rs-btn-primary mt-6 w-full py-3.5 text-lg font-bold"
            >
              {t.saveProfile}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
