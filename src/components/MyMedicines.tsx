import React, { useEffect, useState } from 'react';
import { MedicineAnalysis, SameSaltPair } from '../types/medicine';
import { SupportedLanguage } from '../utils/translations';
import { medicineTranslations } from '../utils/medicineTranslations';
import {
  deleteMedicineFromStorage,
  detectSameSaltPairs,
  getStoredMedicines,
} from '../utils/storage';
import {
  Pill,
  Trash2,
  ChevronRight,
  AlertOctagon,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface MyMedicinesProps {
  language: SupportedLanguage;
  onSelectMedicine: (med: MedicineAnalysis) => void;
}

interface InteractionWarning {
  medicines: string[];
  message: string;
  severity: string;
}

export const MyMedicines: React.FC<MyMedicinesProps> = ({
  language,
  onSelectMedicine,
}) => {
  const mt = medicineTranslations[language];
  const [medicines, setMedicines] = useState<MedicineAnalysis[]>([]);
  const [filter, setFilter] = useState<'all' | 'doctor' | 'self'>('all');
  const [sameSaltPairs, setSameSaltPairs] = useState<SameSaltPair[]>([]);

  const [isCheckingInteractions, setIsCheckingInteractions] = useState(false);
  const [interactionResult, setInteractionResult] = useState<{
    checked: boolean;
    has_warnings: boolean;
    warnings: InteractionWarning[];
    error?: string;
  }>({ checked: false, has_warnings: false, warnings: [] });

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

  const sameSaltIds = new Set(
    sameSaltPairs.flatMap((p) => [p.medA.id, p.medB.id])
  );

  const filteredMedicines = medicines.filter((m) => {
    if (filter === 'doctor') return m.source_tag === 'doctor_prescribed';
    if (filter === 'self') return m.source_tag === 'bought_myself';
    return true;
  });

  const toggleTab = (tab: 'doctor' | 'self') => {
    setFilter((prev) => (prev === tab ? 'all' : tab));
  };

  return (
    <div className="space-y-4">
      {/* Same-Salt Duplicate Warning Banner (only when triggered) */}
      {sameSaltPairs.length > 0 && (
        <div className="rounded-[16px] bg-[var(--color-danger-soft)] shadow-[var(--shadow-card)] px-4 py-3 flex items-center gap-2.5 text-base font-bold text-[var(--color-danger)]">
          <AlertOctagon className="w-5 h-5 shrink-0" />
          <span className="truncate">
            {sameSaltPairs[0].medA.medicine.brand} + {sameSaltPairs[0].medB.medicine.brand} ({sameSaltPairs[0].sharedSalt})
          </span>
        </div>
      )}

      {/* 2 Filter Tabs Only */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => toggleTab('doctor')}
          className={`flex-1 rounded-[14px] py-2.5 px-3 text-base font-bold transition ${
            filter === 'doctor'
              ? 'bg-[var(--color-brand)] text-white shadow-[var(--shadow-card)]'
              : 'rs-card text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]'
          }`}
        >
          {mt.filterDoctor}
        </button>
        <button
          type="button"
          onClick={() => toggleTab('self')}
          className={`flex-1 rounded-[14px] py-2.5 px-3 text-base font-bold transition ${
            filter === 'self'
              ? 'bg-[var(--color-brand)] text-white shadow-[var(--shadow-card)]'
              : 'rs-card text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]'
          }`}
        >
          {mt.filterSelf}
        </button>
      </div>

      {/* Simple Medicine List */}
      {filteredMedicines.length === 0 ? (
        <div className="rs-card p-10 text-center">
          <Pill className="w-10 h-10 text-[var(--color-text-secondary)]/50 mx-auto mb-3" />
          <p className="text-base font-semibold text-[var(--color-text-secondary)]">
            {mt.noMedicinesYet}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMedicines.map((med) => {
            const hasDanger =
              med.medicine.is_expired ||
              sameSaltIds.has(med.id) ||
              (med.risk_flags && med.risk_flags.length > 0);
            const hasCaution =
              !hasDanger &&
              ((med.suspicious_flags && med.suspicious_flags.length > 0) ||
                Boolean(med.allergy_condition_warning));

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
                className="rs-card px-4 py-4 hover:bg-[var(--color-brand-soft)]/40 cursor-pointer flex items-center justify-between gap-3 transition"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-[12px] bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center shrink-0">
                    <Pill className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <h4 className="font-bold text-base text-[var(--color-text)] truncate">
                      {med.medicine.brand}
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[var(--color-text-secondary)] truncate">
                        {tagText}
                      </span>
                      {hasDanger && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger-soft)] text-[var(--color-danger)] px-2.5 py-0.5 text-sm font-bold">
                          <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                          <span>Danger</span>
                        </span>
                      )}
                      {hasCaution && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-caution-soft)] text-[var(--color-text)] px-2.5 py-0.5 text-sm font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-caution)] shrink-0" />
                          <span>Caution</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, med.id)}
                    className="p-2.5 rounded-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]"
                    aria-label="Delete medicine"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Optional compact interaction check when >=2 medicines */}
      {medicines.length >= 2 && (
        <div className="pt-2 space-y-2.5">
          <button
            type="button"
            disabled={isCheckingInteractions}
            onClick={handleCheckInteractions}
            className="rs-card w-full flex items-center justify-center gap-2 py-3.5 px-4 text-base font-bold text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] disabled:opacity-60 transition"
          >
            {isCheckingInteractions ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
            <span>{mt.checkInteractionsBtn}</span>
          </button>

          {interactionResult.error && (
            <p className="text-base font-bold text-[var(--color-danger)] text-center">
              {interactionResult.error}
            </p>
          )}

          {interactionResult.checked && !interactionResult.error && (
            interactionResult.has_warnings && interactionResult.warnings.length > 0 ? (
              <div className="space-y-2">
                {interactionResult.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="rounded-[14px] bg-[var(--color-caution-soft)] px-4 py-3 text-base font-semibold text-[var(--color-text)] flex items-start gap-2.5"
                  >
                    <AlertTriangle className="w-5 h-5 text-[var(--color-caution)] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold">{w.medicines.join(' + ')}: </span>
                      <span>{w.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[14px] bg-[var(--color-normal-soft)] px-4 py-3 text-base font-bold text-[var(--color-normal)] flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>No common conflict found.</span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
