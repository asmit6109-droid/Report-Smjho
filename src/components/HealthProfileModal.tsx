import React, { useState } from 'react';
import { UserProfile } from '../types/report';
import { UserHealthProfile } from '../types/medicine';
import { SupportedLanguage, translations } from '../utils/translations';
import { medicineTranslations } from '../utils/medicineTranslations';
import { X, User, Check, Plus, Baby, HeartHandshake } from 'lucide-react';

interface HealthProfileModalProps {
  language: SupportedLanguage;
  profile: UserProfile;
  healthProfile: UserHealthProfile;
  onSave: (nextProfile: UserProfile, nextHealthProfile: UserHealthProfile) => void;
  onClose: () => void;
}

const COMMON_ALLERGIES = ['Penicillin', 'Sulfa', 'Aspirin / Painkillers'];
const COMMON_CONDITIONS = ['Sugar (Diabetes)', 'High BP', 'Kidney problem', 'Liver problem'];

export const HealthProfileModal: React.FC<HealthProfileModalProps> = ({
  language,
  profile,
  healthProfile,
  onSave,
  onClose,
}) => {
  const t = translations[language];
  const mt = medicineTranslations[language];

  const [age, setAge] = useState<string>(profile.age ? String(profile.age) : '');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(profile.gender);
  const [allergies, setAllergies] = useState<string[]>(healthProfile.allergies || []);
  const [conditions, setConditions] = useState<string[]>(healthProfile.conditions || []);
  const [isPregnant, setIsPregnant] = useState<boolean>(
    Boolean(healthProfile.is_pregnant_or_breastfeeding)
  );
  const [customAllergy, setCustomAllergy] = useState('');
  const [customCondition, setCustomCondition] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const addCustom = (
    raw: string,
    clear: () => void,
    list: string[],
    setList: (v: string[]) => void
  ) => {
    const val = raw.trim();
    if (!val) return;
    if (!list.includes(val)) setList([...list, val]);
    clear();
  };

  const handleSave = () => {
    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      setErrorMsg(
        language === 'hi'
          ? 'कृपया सही उम्र दर्ज करें (1 से 120 वर्ष)'
          : language === 'or'
          ? 'ଦୟାକରି ସଠିକ୍ ବୟସ ପ୍ରବେଶ କରନ୍ତୁ'
          : 'Please enter a valid age (1–120).'
      );
      return;
    }
    if (!gender) {
      setErrorMsg(
        language === 'hi'
          ? 'कृपया अपना लिंग चुनें'
          : language === 'or'
          ? 'ଦୟାକରି ଲିଙ୍ଗ ଚୟନ କରନ୍ତୁ'
          : 'Please select gender.'
      );
      return;
    }

    onSave(
      { ...profile, age: ageNum, gender, disclaimerAccepted: true },
      { allergies, conditions, is_pregnant_or_breastfeeding: isPregnant }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-text)]/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="rs-card w-full max-w-md p-6 my-auto max-h-[90vh] overflow-y-auto space-y-5">
        <div className="flex items-center justify-between border-b border-[var(--color-divider)] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-[var(--color-text)]">
                {language === 'hi'
                  ? 'मेरी स्वास्थ्य प्रोफाइल'
                  : language === 'or'
                  ? 'ମୋର ସ୍ୱାସ୍ଥ୍ୟ ପ୍ରୋଫାଇଲ୍'
                  : 'My Health Profile'}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] font-medium">
                Saved only on this phone
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-[12px] bg-[var(--color-danger-soft)] p-3 text-base font-bold text-[var(--color-danger)]">
            {errorMsg}
          </div>
        )}

        {/* Age & Gender */}
        <div className="space-y-4">
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
              className="w-full rounded-[12px] bg-[var(--color-bg)] px-4 py-3 text-lg font-bold text-[var(--color-text)] focus:outline-2 focus:outline-[var(--color-brand)]"
            />
          </div>

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
                  className={`rounded-[12px] py-3 px-2 text-base font-bold transition ${
                    gender === g.id
                      ? 'bg-[var(--color-brand)] text-white shadow-[var(--shadow-card)]'
                      : 'bg-[var(--color-bg)] text-[var(--color-text)]'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Allergies & Conditions */}
        <div className="pt-3 border-t border-[var(--color-divider)] space-y-4">
          <div className="flex items-center gap-2 text-base font-extrabold text-[var(--color-brand)]">
            <HeartHandshake className="w-5 h-5 shrink-0" />
            <span>{mt.healthProfileTitle}</span>
          </div>

          <div>
            <p className="text-base font-bold text-[var(--color-text)] mb-2">{mt.allergiesLabel}</p>
            <div className="flex flex-wrap gap-2">
              {[...new Set([...COMMON_ALLERGIES, ...allergies])].map((item) => {
                const active = allergies.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleItem(allergies, setAllergies, item)}
                    className={`rounded-full px-4 py-2 text-base font-bold transition ${
                      active
                        ? 'bg-[var(--color-brand)] text-white'
                        : 'bg-[var(--color-bg)] text-[var(--color-text)]'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-2.5">
              <input
                type="text"
                value={customAllergy}
                onChange={(e) => setCustomAllergy(e.target.value)}
                placeholder="Add other allergy..."
                className="flex-1 rounded-[12px] bg-[var(--color-bg)] px-3.5 py-2.5 text-base text-[var(--color-text)] focus:outline-2 focus:outline-[var(--color-brand)]"
              />
              <button
                type="button"
                onClick={() => addCustom(customAllergy, () => setCustomAllergy(''), allergies, setAllergies)}
                aria-label="Add allergy"
                className="rs-btn-primary px-4"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div>
            <p className="text-base font-bold text-[var(--color-text)] mb-2">{mt.conditionsLabel}</p>
            <div className="flex flex-wrap gap-2">
              {[...new Set([...COMMON_CONDITIONS, ...conditions])].map((item) => {
                const active = conditions.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleItem(conditions, setConditions, item)}
                    className={`rounded-full px-4 py-2 text-base font-bold transition ${
                      active
                        ? 'bg-[var(--color-brand)] text-white'
                        : 'bg-[var(--color-bg)] text-[var(--color-text)]'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-2.5">
              <input
                type="text"
                value={customCondition}
                onChange={(e) => setCustomCondition(e.target.value)}
                placeholder="Add other condition..."
                className="flex-1 rounded-[12px] bg-[var(--color-bg)] px-3.5 py-2.5 text-base text-[var(--color-text)] focus:outline-2 focus:outline-[var(--color-brand)]"
              />
              <button
                type="button"
                onClick={() =>
                  addCustom(customCondition, () => setCustomCondition(''), conditions, setConditions)
                }
                aria-label="Add condition"
                className="rs-btn-primary px-4"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-[14px] bg-[var(--color-brand-soft)] px-4 py-3 cursor-pointer min-h-[44px]">
            <span className="flex items-center gap-2.5 text-base font-bold text-[var(--color-text)]">
              <Baby className="w-5 h-5 text-[var(--color-brand)] shrink-0" />
              <span>{mt.pregnantLabel}</span>
            </span>
            <input
              type="checkbox"
              checked={isPregnant}
              onChange={(e) => setIsPregnant(e.target.checked)}
              className="w-5 h-5 accent-[var(--color-brand)]"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="rs-btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base font-extrabold"
        >
          <Check className="w-5 h-5" />
          <span>
            {language === 'hi'
              ? 'प्रोफाइल सेव करें'
              : language === 'or'
              ? 'ପ୍ରୋଫାଇଲ୍ ସେଭ୍ କରନ୍ତୁ'
              : 'Save Profile'}
          </span>
        </button>
      </div>
    </div>
  );
};
