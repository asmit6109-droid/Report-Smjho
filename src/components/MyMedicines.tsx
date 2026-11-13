import React, { useEffect, useState } from 'react';
import {
  MedicineAnalysis,
  MedicineSourceTag,
  SameSaltPair,
  UserHealthProfile,
} from '../types/medicine';
import { SupportedLanguage } from '../utils/translations';
import { medicineTranslations } from '../utils/medicineTranslations';
import {
  deleteMedicineFromStorage,
  detectSameSaltPairs,
  getHealthProfile,
  getStoredMedicines,
  getStoredReports,
  saveHealthProfile,
  updateMedicineInStorage,
} from '../utils/storage';
import {
  ArrowLeft,
  Pill,
  Trash2,
  ChevronRight,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  HeartHandshake,
  Loader2,
  CheckCircle2,
  Edit3,
  Plus,
  X,
} from 'lucide-react';

interface MyMedicinesProps {
  language: SupportedLanguage;
  onSelectMedicine: (med: MedicineAnalysis) => void;
  onBackToHome: () => void;
}

interface InteractionWarning {
  medicines: string[];
  message: string;
  severity: string;
}

const COMMON_ALLERGIES = ['Penicillin', 'Sulfa', 'Aspirin / Painkillers'];
const COMMON_CONDITIONS = ['Sugar (Diabetes)', 'High BP', 'Kidney problem', 'Liver problem', 'Pregnant'];

export const MyMedicines: React.FC<MyMedicinesProps> = ({
  language,
  onSelectMedicine,
  onBackToHome,
}) => {
  const mt = medicineTranslations[language];
  const [medicines, setMedicines] = useState<MedicineAnalysis[]>([]);
  const [filter, setFilter] = useState<'all' | 'doctor' | 'self'>('all');
  const [sameSaltPairs, setSameSaltPairs] = useState<SameSaltPair[]>([]);

  // Interaction checker state
  const [isCheckingInteractions, setIsCheckingInteractions] = useState(false);
  const [interactionResult, setInteractionResult] = useState<{
    checked: boolean;
    has_warnings: boolean;
    warnings: InteractionWarning[];
    error?: string;
  }>({ checked: false, has_warnings: false, warnings: [] });

  // Health profile (allergies + conditions)
  const [healthProfile, setHealthProfile] = useState<UserHealthProfile>(getHealthProfile());
  const [showHealthEditor, setShowHealthEditor] = useState(false);
  const [customAllergy, setCustomAllergy] = useState('');
  const [customCondition, setCustomCondition] = useState('');

  // Inline metadata editing for a medicine
  const [editingMed, setEditingMed] = useState<MedicineAnalysis | null>(null);
  const savedReports = getStoredReports();

  useEffect(() => {
    reload();
  }, []);

  const reload = () => {
    const list = getStoredMedicines();
    setMedicines(list);
    setSameSaltPairs(detectSameSaltPairs(list));
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteMedicineFromStorage(id);
    setInteractionResult({ checked: false, has_warnings: false, warnings: [] });
    reload();
  };

  const handleCheckInteractions = async () => {
    if (medicines.length < 2) return;
    setIsCheckingInteractions(true);
    try {
      const res = await fetch('/api/check-medicine-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicines: medicines.map((m) => ({
            id: m.id,
            brand: m.medicine.brand,
            salt: m.medicine.salt,
            strength: m.medicine.strength,
            verified_interactions: m.verified_facts?.interactions || undefined,
          })),
          language,
        }),
      });
      const raw = await res.text();
      const data = JSON.parse(raw);
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Could not check right now.');
      }
      setInteractionResult({
        checked: true,
        has_warnings: Boolean(data.has_warnings),
        warnings: data.warnings || [],
      });
    } catch (err: unknown) {
      setInteractionResult({
        checked: true,
        has_warnings: false,
        warnings: [],
        error: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setIsCheckingInteractions(false);
    }
  };

  const toggleProfileItem = (type: 'allergies' | 'conditions', value: string) => {
    const current = healthProfile[type];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    const updated = { ...healthProfile, [type]: next };
    setHealthProfile(updated);
    saveHealthProfile(updated);
  };

  const addCustomProfileItem = (type: 'allergies' | 'conditions') => {
    const val = (type === 'allergies' ? customAllergy : customCondition).trim();
    if (!val) return;
    if (!healthProfile[type].includes(val)) {
      const updated = { ...healthProfile, [type]: [...healthProfile[type], val] };
      setHealthProfile(updated);
      saveHealthProfile(updated);
    }
    if (type === 'allergies') setCustomAllergy('');
    else setCustomCondition('');
  };

  const handleSaveEdit = () => {
    if (!editingMed) return;
    updateMedicineInStorage(editingMed);
    setEditingMed(null);
    reload();
  };

  const filteredMedicines = medicines.filter((m) => {
    if (filter === 'doctor') return m.source_tag === 'doctor_prescribed';
    if (filter === 'self') return m.source_tag === 'bought_myself';
    return true;
  });

  return (
    <div className="max-w-xl mx-auto px-4 pb-20 pt-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 shadow-xs hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <h2 className="text-base font-bold text-slate-900">{mt.myMedicinesBtn}</h2>
        <div className="w-12" />
      </div>

      {/* Same-Salt Duplicate Warning Banner */}
      {sameSaltPairs.length > 0 && (
        <div className="rounded-3xl bg-rose-50 border-2 border-rose-300 p-4 space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-black text-rose-950">Same Medicine Inside!</h3>
              <p className="text-xs font-bold text-rose-900 mt-0.5 leading-snug">
                {mt.sameSaltWarning}
              </p>
            </div>
          </div>
          <div className="space-y-1.5 pt-1">
            {sameSaltPairs.map((pair, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-white border border-rose-200 px-3 py-2 text-xs font-bold text-rose-950"
              >
                {pair.medA.medicine.brand} + {pair.medB.medicine.brand} ({pair.sharedSalt})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interaction Check Button & Results (when >= 2 medicines) */}
      {medicines.length >= 2 && (
        <div className="rounded-3xl bg-white border border-slate-200 p-4 shadow-xs space-y-3">
          <button
            type="button"
            disabled={isCheckingInteractions}
            onClick={handleCheckInteractions}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-700 py-3 px-4 text-xs font-extrabold text-white hover:bg-indigo-800 transition disabled:opacity-60"
          >
            {isCheckingInteractions ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldAlert className="w-4 h-4" />
            )}
            <span>{mt.checkInteractionsBtn}</span>
          </button>

          {interactionResult.error && (
            <p className="text-xs font-bold text-rose-700 text-center">
              {interactionResult.error}
            </p>
          )}

          {interactionResult.checked && !interactionResult.error && (
            interactionResult.has_warnings && interactionResult.warnings.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>{mt.interactionWarning}</span>
                </p>
                {interactionResult.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-amber-50 border border-amber-300 p-3 text-xs"
                  >
                    <p className="font-black text-amber-950">{w.medicines.join(' + ')}</p>
                    <p className="font-semibold text-amber-900 mt-0.5">{w.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No common conflict found. Always confirm with your pharmacist.</span>
              </div>
            )
          )}
        </div>
      )}

      {/* Optional Health Profile (Allergies & Conditions) */}
      <div className="rounded-3xl bg-white border border-slate-200 p-4 shadow-xs">
        <button
          type="button"
          onClick={() => setShowHealthEditor((prev) => !prev)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-teal-700" />
            <div>
              <span className="text-xs font-black text-slate-900 block">
                {mt.healthProfileTitle}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {healthProfile.allergies.length +
                  healthProfile.conditions.length +
                  (healthProfile.is_pregnant_or_breastfeeding ? 1 : 0) >
                0
                  ? [
                      ...healthProfile.allergies,
                      ...healthProfile.conditions,
                      ...(healthProfile.is_pregnant_or_breastfeeding ? [mt.pregnantLabel] : []),
                    ].join(', ')
                  : 'Tap to add allergies, sugar, BP, kidney/liver, pregnancy'}
              </span>
            </div>
          </div>
          <Edit3 className="w-4 h-4 text-slate-400" />
        </button>

        {showHealthEditor && (
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
            {/* Pregnant / Breastfeeding toggle */}
            <label className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 cursor-pointer">
              <span className="text-xs font-bold text-slate-800">{mt.pregnantLabel}</span>
              <input
                type="checkbox"
                checked={Boolean(healthProfile.is_pregnant_or_breastfeeding)}
                onChange={(e) => {
                  const updated = {
                    ...healthProfile,
                    is_pregnant_or_breastfeeding: e.target.checked,
                  };
                  setHealthProfile(updated);
                  saveHealthProfile(updated);
                }}
                className="w-4 h-4 accent-teal-700"
              />
            </label>
            {/* Allergies */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                {mt.allergiesLabel}
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_ALLERGIES.map((a) => {
                  const active = healthProfile.allergies.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleProfileItem('allergies', a)}
                      className={`rounded-xl px-2.5 py-1 text-[11px] font-bold border ${
                        active
                          ? 'bg-rose-50 border-rose-400 text-rose-900'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {a}
                    </button>
                  );
                })}
                {healthProfile.allergies
                  .filter((a) => !COMMON_ALLERGIES.includes(a))
                  .map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleProfileItem('allergies', a)}
                      className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold bg-rose-50 border border-rose-400 text-rose-900"
                    >
                      <span>{a}</span>
                      <X className="w-3 h-3" />
                    </button>
                  ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={customAllergy}
                  onChange={(e) => setCustomAllergy(e.target.value)}
                  placeholder="Other allergy..."
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => addCustomProfileItem('allergies')}
                  className="rounded-xl bg-slate-800 text-white px-3 py-1.5 text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Conditions */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                {mt.conditionsLabel}
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_CONDITIONS.map((c) => {
                  const active = healthProfile.conditions.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleProfileItem('conditions', c)}
                      className={`rounded-xl px-2.5 py-1 text-[11px] font-bold border ${
                        active
                          ? 'bg-teal-50 border-teal-500 text-teal-900'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
                {healthProfile.conditions
                  .filter((c) => !COMMON_CONDITIONS.includes(c))
                  .map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleProfileItem('conditions', c)}
                      className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold bg-teal-50 border border-teal-500 text-teal-900"
                    >
                      <span>{c}</span>
                      <X className="w-3 h-3" />
                    </button>
                  ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={customCondition}
                  onChange={(e) => setCustomCondition(e.target.value)}
                  placeholder="Other problem..."
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => addCustomProfileItem('conditions')}
                  className="rounded-xl bg-slate-800 text-white px-3 py-1.5 text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { id: 'all', label: mt.filterAll },
            { id: 'doctor', label: mt.filterDoctor },
            { id: 'self', label: mt.filterSelf },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`rounded-2xl py-2 px-2 text-xs font-bold border transition ${
              filter === tab.id
                ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Saved Medicines List */}
      {filteredMedicines.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 border border-slate-200 text-center">
          <Pill className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-xs font-medium text-slate-600 leading-relaxed">
            {mt.noMedicinesYet}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMedicines.map((med) => {
            const linkedReport = savedReports.find((r) => r.id === med.linked_report_id);
            const accessColor =
              med.medicine.access_level === 'otc'
                ? 'bg-emerald-500'
                : med.medicine.access_level === 'prescription_only'
                ? 'bg-rose-600'
                : 'bg-amber-500';
            const tagText =
              med.source_tag === 'doctor_prescribed'
                ? mt.tagDoctor
                : med.source_tag === 'bought_myself'
                ? mt.tagSelf
                : mt.tagNotSure;

            return (
              <div
                key={med.id}
                onClick={() => onSelectMedicine(med)}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-teal-400 cursor-pointer transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 relative">
                      <Pill className="w-5 h-5" />
                      <span
                        className={`w-2.5 h-2.5 rounded-full border-2 border-white absolute -top-0.5 -right-0.5 ${accessColor}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-teal-800 truncate">
                        {med.medicine.brand}
                      </h4>
                      {med.medicine.salt && (
                        <p className="text-xs text-slate-500 font-medium truncate">
                          {med.medicine.salt} {med.medicine.strength || ''}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {tagText}
                        </span>
                        {med.medicine.is_expired && (
                          <span className="rounded-lg bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white">
                            EXPIRED
                          </span>
                        )}
                        {med.risk_flags?.length > 0 && (
                          <span className="rounded-lg bg-orange-100 border border-orange-300 px-2 py-0.5 text-[10px] font-bold text-orange-900">
                            Need Rx
                          </span>
                        )}
                        {med.doctor_name && (
                          <span className="text-[10px] font-semibold text-slate-500">
                            Dr. {med.doctor_name}
                          </span>
                        )}
                        {med.duration_days && (
                          <span className="text-[10px] font-semibold text-teal-700">
                            • {med.duration_days}
                          </span>
                        )}
                        {linkedReport && (
                          <span className="text-[10px] font-semibold text-indigo-700">
                            • {linkedReport.report_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingMed(med);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50"
                      title="Edit details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, med.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Medicine Metadata Modal */}
      {editingMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-slate-900">
              Edit: {editingMed.medicine.brand}
            </h3>

            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'doctor_prescribed', label: mt.tagDoctor },
                  { id: 'bought_myself', label: mt.tagSelf },
                  { id: 'not_sure', label: mt.tagNotSure },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    setEditingMed({ ...editingMed, source_tag: opt.id as MedicineSourceTag })
                  }
                  className={`rounded-xl px-2 py-2 text-[10px] font-bold border ${
                    (editingMed.source_tag || 'not_sure') === opt.id
                      ? 'bg-teal-50 border-teal-600 text-teal-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={editingMed.doctor_name || ''}
              onChange={(e) => setEditingMed({ ...editingMed, doctor_name: e.target.value })}
              placeholder={mt.doctorNameLabel}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={editingMed.duration_days || ''}
              onChange={(e) => setEditingMed({ ...editingMed, duration_days: e.target.value })}
              placeholder={mt.daysLabel}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />

            {savedReports.length > 0 && (
              <select
                value={editingMed.linked_report_id || ''}
                onChange={(e) =>
                  setEditingMed({
                    ...editingMed,
                    linked_report_id: e.target.value || undefined,
                  })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              >
                <option value="">-- {mt.linkedReportLabel} --</option>
                {savedReports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.report_type} ({new Date(r.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingMed(null)}
                className="rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="rounded-xl bg-teal-700 py-2.5 text-xs font-extrabold text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
