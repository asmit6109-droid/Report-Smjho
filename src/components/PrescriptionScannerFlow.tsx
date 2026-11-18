import React, { useState } from 'react';
import {
  MedicineAnalysis,
  PrescriptionLineItem,
  PrescriptionRecord,
} from '../types/medicine';
import { ReportAnalysis } from '../types/report';
import { SupportedLanguage } from '../utils/translations';
import { medicineTranslations } from '../utils/medicineTranslations';
import {
  getStoredReports,
  saveMedicineToStorage,
  savePrescriptionToStorage,
} from '../utils/storage';
import {
  ArrowLeft,
  AlertTriangle,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  Pill,
  ChevronRight,
  Bookmark,
  FileText,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface PrescriptionDraft {
  doctor_name?: string | null;
  date?: string | null;
  lines: PrescriptionLineItem[];
}

interface PrescriptionVerifyProps {
  language: SupportedLanguage;
  draft: PrescriptionDraft;
  onConfirm: (payload: {
    lines: PrescriptionLineItem[];
    doctor_name: string;
    date: string;
    userProblem: string;
    report: ReportAnalysis | null;
  }) => void;
  onBack: () => void;
}

export const PrescriptionVerifyScreen: React.FC<PrescriptionVerifyProps> = ({
  language,
  draft,
  onConfirm,
  onBack,
}) => {
  const mt = medicineTranslations[language];
  const [doctorName, setDoctorName] = useState(draft.doctor_name || '');
  const [rxDate, setRxDate] = useState(draft.date || '');
  const [lines, setLines] = useState<PrescriptionLineItem[]>(
    draft.lines.length > 0
      ? draft.lines
      : [
          {
            id: 'rx-line-1',
            name: '',
            instructions: '',
            duration: '',
            confidence: 'low',
            needs_check: true,
          },
        ]
  );
  const [userProblem, setUserProblem] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const savedReports = getStoredReports();

  const updateLine = (
    idx: number,
    field: keyof PrescriptionLineItem,
    val: string | boolean
  ) => {
    setLines((prev) =>
      prev.map((item, i) =>
        i === idx
          ? {
              ...item,
              [field]: val,
              needs_check: field === 'name' ? false : item.needs_check,
            }
          : item
      )
    );
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `rx-line-${Date.now()}`,
        name: '',
        instructions: '',
        duration: '',
        confidence: 'high',
        needs_check: false,
      },
    ]);
  };

  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirm = () => {
    const validLines = lines.filter((l) => l.name.trim().length > 0);
    if (validLines.length === 0) return;
    const report = savedReports.find((r) => r.id === selectedReportId) || null;
    onConfirm({
      lines: validLines,
      doctor_name: doctorName.trim(),
      date: rxDate.trim(),
      userProblem: userProblem.trim(),
      report,
    });
  };

  return (
    <div className="max-w-xl mx-auto px-4 pb-16 pt-4 space-y-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rs-card inline-flex items-center gap-2 px-4 py-2.5 text-base font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
      </div>

      <div className="rs-card p-6 space-y-5">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--color-text)]">{mt.rxVerifyTitle}</h2>
          <p className="text-base text-[var(--color-text-secondary)] font-medium mt-1">
            {mt.rxVerifySubtitle}
          </p>
        </div>

        {/* Optional doctor & date */}
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            placeholder={mt.doctorNameLabel}
            className="rounded-[12px] bg-[var(--color-bg)] px-3.5 py-2.5 text-base text-[var(--color-text)] focus:outline-2 focus:outline-[var(--color-brand)]"
          />
          <input
            type="text"
            value={rxDate}
            onChange={(e) => setRxDate(e.target.value)}
            placeholder="Date (optional)"
            className="rounded-[12px] bg-[var(--color-bg)] px-3.5 py-2.5 text-base text-[var(--color-text)] focus:outline-2 focus:outline-[var(--color-brand)]"
          />
        </div>

        {/* Medicine lines */}
        <div className="space-y-3">
          {lines.map((line, idx) => {
            const highlightYellow = line.needs_check || line.confidence !== 'high';
            return (
              <div
                key={line.id}
                className={`rounded-[14px] p-4 space-y-3 ${
                  highlightYellow
                    ? 'bg-[var(--color-caution-soft)]'
                    : 'bg-[var(--color-bg)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-extrabold text-[var(--color-text)]">
                    Medicine #{idx + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    {highlightYellow && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface)] px-3 py-1 text-sm font-bold text-[var(--color-text)]">
                        <AlertTriangle className="w-4 h-4 text-[var(--color-caution)] shrink-0" />
                        <span>{mt.rxCheckBadge}</span>
                      </span>
                    )}
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        aria-label="Remove line"
                        className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <input
                  type="text"
                  value={line.name}
                  onChange={(e) => updateLine(idx, 'name', e.target.value)}
                  placeholder="Medicine name & strength"
                  className="w-full rounded-[12px] bg-[var(--color-surface)] px-3.5 py-2.5 text-base font-bold text-[var(--color-text)] focus:outline-2 focus:outline-[var(--color-brand)]"
                />

                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={line.instructions}
                    onChange={(e) => updateLine(idx, 'instructions', e.target.value)}
                    placeholder="How to take (as written)"
                    className="rounded-[12px] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-text)] focus:outline-2 focus:outline-[var(--color-brand)]"
                  />
                  <input
                    type="text"
                    value={line.duration}
                    onChange={(e) => updateLine(idx, 'duration', e.target.value)}
                    placeholder={mt.daysLabel}
                    className="rounded-[12px] bg-[var(--color-surface)] px-3.5 py-2.5 text-base text-[var(--color-text)] focus:outline-2 focus:outline-[var(--color-brand)]"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addLine}
          className="w-full flex items-center justify-center gap-2 rounded-[14px] bg-[var(--color-brand-soft)] py-3 text-base font-bold text-[var(--color-brand)] hover:bg-[var(--color-divider)] transition"
        >
          <Plus className="w-5 h-5" />
          <span>{mt.rxAddLine}</span>
        </button>

        {/* Optional Problem & Saved Report link */}
        <div className="pt-3 border-t border-[var(--color-divider)] space-y-3">
          <input
            type="text"
            value={userProblem}
            onChange={(e) => setUserProblem(e.target.value)}
            placeholder={mt.problemPlaceholder}
            className="w-full rounded-[12px] bg-[var(--color-bg)] px-4 py-3 text-base text-[var(--color-text)] focus:outline-2 focus:outline-[var(--color-brand)]"
          />

          {savedReports.length > 0 && (
            <select
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(e.target.value)}
              className="w-full rounded-[12px] bg-[var(--color-bg)] px-4 py-3 text-base font-semibold text-[var(--color-text)]"
            >
              <option value="">-- Link a saved report (optional) --</option>
              {savedReports.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.report_type} ({new Date(rep.created_at).toLocaleDateString()})
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          className="rs-btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base font-extrabold"
        >
          <Check className="w-5 h-5" />
          <span>{mt.rxConfirmBtn}</span>
        </button>
      </div>
    </div>
  );
};

interface PrescriptionResultsProps {
  language: SupportedLanguage;
  prescription: PrescriptionRecord;
  onSelectMedicine: (med: MedicineAnalysis) => void;
  onBack: () => void;
}

export const PrescriptionResultsScreen: React.FC<PrescriptionResultsProps> = ({
  language,
  prescription,
  onSelectMedicine,
  onBack,
}) => {
  const mt = medicineTranslations[language];
  const [savedAll, setSavedAll] = useState(false);

  const handleSaveAll = () => {
    savePrescriptionToStorage(prescription);
    for (const med of prescription.medicines) {
      saveMedicineToStorage(med);
    }
    setSavedAll(true);
  };

  return (
    <div className="max-w-xl mx-auto px-4 pb-16 pt-4 space-y-5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rs-card inline-flex items-center gap-2 px-4 py-2.5 text-base font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={handleSaveAll}
          className={`inline-flex items-center gap-2 rounded-[14px] px-4 py-2.5 text-base font-extrabold shadow-[var(--shadow-card)] transition ${
            savedAll
              ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
              : 'rs-btn-primary'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>{savedAll ? mt.savedMedicineSuccess : 'Save All'}</span>
        </button>
      </div>

      {/* Combined Why This Prescription Card */}
      {prescription.why_this_prescription && (
        <div className="rs-card p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-[var(--color-brand)]">
            <Sparkles className="w-5 h-5 shrink-0" />
            <h2 className="text-xl font-extrabold text-[var(--color-text)]">{mt.rxSummaryTitle}</h2>
          </div>

          <p className="text-base font-bold text-[var(--color-text)] leading-snug">
            {prescription.why_this_prescription.why_given}
          </p>

          {prescription.why_this_prescription.what_to_do_now?.length > 0 && (
            <ul className="space-y-1.5">
              {prescription.why_this_prescription.what_to_do_now.map((step, i) => (
                <li key={i} className="text-base font-medium text-[var(--color-text)] flex gap-2">
                  <span className="text-[var(--color-brand)]">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          )}

          {prescription.why_this_prescription.ask_doctor?.length > 0 && (
            <div className="rounded-[14px] bg-[var(--color-bg)] p-4">
              <h4 className="text-base font-extrabold text-[var(--color-brand)] flex items-center gap-1.5 mb-1.5">
                <HelpCircle className="w-4 h-4" />
                <span>{mt.askYourDoctor}</span>
              </h4>
              <ul className="space-y-1">
                {prescription.why_this_prescription.ask_doctor.map((q, i) => (
                  <li key={i} className="text-base font-medium text-[var(--color-text)]">
                    • {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Individual Medicine Cards */}
      <div className="space-y-3">
        <h3 className="text-base font-extrabold text-[var(--color-text-secondary)] px-1 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--color-brand)]" />
          <span>Medicines ({prescription.medicines.length})</span>
        </h3>

        {prescription.medicines.map((med) => (
          <div
            key={med.id}
            onClick={() => onSelectMedicine(med)}
            className="rs-card p-4 hover:bg-[var(--color-brand-soft)]/40 cursor-pointer transition flex items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-[12px] bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center shrink-0">
                <Pill className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-lg text-[var(--color-text)] truncate">
                    {med.medicine.brand}
                  </h4>
                  {med.verification_status === 'verified' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-normal-soft)] px-2.5 py-0.5 text-sm font-bold text-[var(--color-normal)]">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{mt.sourceVerified}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-caution-soft)] px-2.5 py-0.5 text-sm font-bold text-[var(--color-text)]">
                      <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-caution)] shrink-0" />
                      <span>{mt.sourceNotVerified}</span>
                    </span>
                  )}
                </div>
                <p className="text-base text-[var(--color-text-secondary)] font-medium mt-0.5 line-clamp-1">
                  {med.purpose}
                </p>
                <p className="text-base font-bold text-[var(--color-brand)] mt-1">
                  {med.how_to_take_as_printed}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)] shrink-0" />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="rounded-[16px] bg-[var(--color-surface-subtle)] p-4 text-center space-y-1">
        <p className="text-base font-bold text-[var(--color-text)]">{mt.medicineFooter}</p>
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          {mt.appNotReplaceDoctor}
        </p>
      </div>
    </div>
  );
};
