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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 my-auto max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {language === 'hi'
                  ? 'मेरी स्वास्थ्य प्रोफाइल'
                  : language === 'or'
                  ? 'ମୋର ସ୍ୱାସ୍ଥ୍ୟ ପ୍ରୋଫାଇଲ୍'
                  : 'My Health Profile'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Saved only on this phone
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-bold text-rose-700">
            {errorMsg}
          </div>
        )}

        {/* Age & Gender */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
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
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-teal-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  className={`rounded-xl border py-2 px-2 text-xs font-bold transition ${
                    gender === g.id
                      ? 'border-teal-700 bg-teal-50 text-teal-900'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Allergies & Conditions */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-900">
            <HeartHandshake className="w-4 h-4 text-indigo-600" />
            <span>{mt.healthProfileTitle}</span>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-600 mb-1.5">{mt.allergiesLabel}</p>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set([...COMMON_ALLERGIES, ...allergies])].map((item) => {
                const active = allergies.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleItem(allergies, setAllergies, item)}
                    className={`rounded-full px-3 py-1 text-xs font-bold border transition ${
                      active
                        ? 'bg-indigo-700 text-white border-indigo-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-1.5 mt-2">
              <input
                type="text"
                value={customAllergy}
                onChange={(e) => setCustomAllergy(e.target.value)}
                placeholder="Add other allergy..."
                className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={() => addCustom(customAllergy, () => setCustomAllergy(''), allergies, setAllergies)}
                className="rounded-xl bg-slate-800 px-3 text-white"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-600 mb-1.5">{mt.conditionsLabel}</p>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set([...COMMON_CONDITIONS, ...conditions])].map((item) => {
                const active = conditions.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleItem(conditions, setConditions, item)}
                    className={`rounded-full px-3 py-1 text-xs font-bold border transition ${
                      active
                        ? 'bg-indigo-700 text-white border-indigo-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-1.5 mt-2">
              <input
                type="text"
                value={customCondition}
                onChange={(e) => setCustomCondition(e.target.value)}
                placeholder="Add other condition..."
                className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={() =>
                  addCustom(customCondition, () => setCustomCondition(''), conditions, setConditions)
                }
                className="rounded-xl bg-slate-800 px-3 text-white"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <label className="flex items-center justify-between gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/50 px-3.5 py-2.5 cursor-pointer">
            <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Baby className="w-4 h-4 text-indigo-700 shrink-0" />
              <span>{mt.pregnantLabel}</span>
            </span>
            <input
              type="checkbox"
              checked={isPregnant}
              onChange={(e) => setIsPregnant(e.target.checked)}
              className="w-4 h-4 accent-indigo-700"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-teal-700 py-3 text-sm font-extrabold text-white shadow-md hover:bg-teal-800 transition"
        >
          <Check className="w-4 h-4" />
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
