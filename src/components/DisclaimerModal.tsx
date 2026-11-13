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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 my-auto">
        {/* Language switcher selector at the top */}
        <div className="flex justify-end gap-1 mb-4">
          <button
            type="button"
            onClick={() => setSelectedLang('en')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
              selectedLang === 'en'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setSelectedLang('hi')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
              selectedLang === 'hi'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            हिन्दी
          </button>
          <button
            type="button"
            onClick={() => setSelectedLang('or')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
              selectedLang === 'or'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ଓଡ଼ିଆ
          </button>
        </div>

        {step === 'disclaimer' ? (
          <div>
            {/* Header Icon */}
            <div className="flex justify-center mb-3">
              <div className="h-16 w-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-xs">
                <HeartPulse className="w-9 h-9" />
              </div>
            </div>

            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 mb-2">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                {t.disclaimerTitle}
              </span>
              <h2 className="text-xl font-black text-slate-900 leading-snug">
                {t.appName}
              </h2>
              <p className="mt-2 text-sm text-slate-700 font-medium leading-relaxed bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/70">
                {t.disclaimerNotice}
              </p>
            </div>

            {/* Clear bullet points */}
            <div className="mt-5 space-y-2.5 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{t.disclaimerBullet1}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{t.disclaimerBullet2}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-semibold text-slate-900">{t.disclaimerBullet3}</span>
              </div>
            </div>

            {/* Accept Button */}
            <button
              type="button"
              onClick={handleAcceptDisclaimer}
              className="mt-6 w-full rounded-2xl bg-teal-700 py-3.5 text-base font-bold text-white shadow-md hover:bg-teal-800 transition active:scale-98"
            >
              {t.acceptAndContinue}
            </button>
          </div>
        ) : (
          <div>
            {/* Step 2: Age and Gender */}
            <div className="flex justify-center mb-3">
              <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-xs">
                <User className="w-7 h-7" />
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-lg font-black text-slate-900 leading-snug">
                {t.setupProfileTitle}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {t.setupProfileSub}
              </p>
            </div>

            {errorMsg && (
              <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-semibold text-rose-700 text-center">
                {errorMsg}
              </div>
            )}

            <div className="mt-5 space-y-4">
              {/* Age Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
                  className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-lg font-bold text-slate-900 focus:border-teal-600 focus:outline-hidden"
                />
              </div>

              {/* Gender Radio Choices */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t.genderLabel}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGender('male');
                      setErrorMsg('');
                    }}
                    className={`rounded-2xl border-2 py-3 px-2 text-center text-xs font-bold transition active:scale-95 ${
                      gender === 'male'
                        ? 'border-teal-700 bg-teal-50 text-teal-900 ring-1 ring-teal-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    👨 {t.genderMale}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGender('female');
                      setErrorMsg('');
                    }}
                    className={`rounded-2xl border-2 py-3 px-2 text-center text-xs font-bold transition active:scale-95 ${
                      gender === 'female'
                        ? 'border-teal-700 bg-teal-50 text-teal-900 ring-1 ring-teal-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    👩 {t.genderFemale}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGender('other');
                      setErrorMsg('');
                    }}
                    className={`rounded-2xl border-2 py-3 px-2 text-center text-xs font-bold transition active:scale-95 ${
                      gender === 'other'
                        ? 'border-teal-700 bg-teal-50 text-teal-900 ring-1 ring-teal-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    👤 {t.genderOther}
                  </button>
                </div>
              </div>
            </div>

            {/* Save Profile Button */}
            <button
              type="button"
              onClick={handleFinishProfile}
              className="mt-6 w-full rounded-2xl bg-teal-700 py-3.5 text-base font-bold text-white shadow-md hover:bg-teal-800 transition active:scale-98"
            >
              {t.saveProfile}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
