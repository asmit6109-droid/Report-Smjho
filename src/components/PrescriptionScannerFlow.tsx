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
    <div className="max-w-xl mx-auto px-4 pb-16 pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 shadow-xs hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      <div className="rounded-3xl bg-white p-5 border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-black text-slate-900">{mt.rxVerifyTitle}</h2>
          <p className="text-xs text-slate-600 font-medium mt-1">{mt.rxVerifySubtitle}</p>
        </div>

        {/* Optional doctor & date */}
        <div className="grid grid-cols-2 gap-2.5">
          <input
            type="text"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            placeholder={mt.doctorNameLabel}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900"
          />
          <input
            type="text"
            value={rxDate}
            onChange={(e) => setRxDate(e.target.value)}
            placeholder="Date (optional)"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900"
          />
        </div>

        {/* Medicine lines */}
        <div className="space-y-3">
          {lines.map((line, idx) => {
            const highlightYellow = line.needs_check || line.confidence !== 'high';
            return (
              <div
                key={line.id}
                className={`rounded-2xl p-3.5 border-2 space-y-2.5 ${
                  highlightYellow
                    ? 'bg-amber-50 border-amber-400'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-700">
                    Medicine #{idx + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    {highlightYellow && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-2.5 py-0.5 text-[10px] font-black text-amber-950">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{mt.rxCheckBadge}</span>
                      </span>
                    )}
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600"
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={line.instructions}
                    onChange={(e) => updateLine(idx, 'instructions', e.target.value)}
                    placeholder="How to take (as written)"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
                  />
                  <input
                    type="text"
                    value={line.duration}
                    onChange={(e) => updateLine(idx, 'duration', e.target.value)}
                    placeholder={mt.daysLabel}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addLine}
          className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <Plus className="w-4 h-4" />
          <span>{mt.rxAddLine}</span>
        </button>

        {/* Optional Problem & Saved Report link */}
        <div className="pt-2 border-t border-slate-100 space-y-2.5">
          <input
            type="text"
            value={userProblem}
            onChange={(e) => setUserProblem(e.target.value)}
            placeholder={mt.problemPlaceholder}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-900"
          />

          {savedReports.length > 0 && (
            <select
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700"
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
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-teal-700 py-3.5 text-sm font-extrabold text-white shadow-md hover:bg-teal-800 transition active:scale-98"
        >
          <Check className="w-4 h-4" />
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
    <div className="max-w-xl mx-auto px-4 pb-16 pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 shadow-xs hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={handleSaveAll}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold shadow-xs transition ${
            savedAll
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : 'bg-teal-700 text-white hover:bg-teal-800'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>{savedAll ? mt.savedMedicineSuccess : 'Save All to My Medicines'}</span>
        </button>
      </div>

      {/* Combined Why This Prescription Card */}
      {prescription.why_this_prescription && (
        <div className="rounded-3xl bg-indigo-50 border border-indigo-200 p-5 space-y-3">
          <div className="flex items-center gap-2 text-indigo-900">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-base font-black">{mt.rxSummaryTitle}</h2>
          </div>

          <p className="text-sm font-bold text-slate-900 leading-snug">
            {prescription.why_this_prescription.why_given}
          </p>

          {prescription.why_this_prescription.what_to_do_now?.length > 0 && (
            <ul className="space-y-1">
              {prescription.why_this_prescription.what_to_do_now.map((step, i) => (
                <li key={i} className="text-xs font-semibold text-slate-800 flex gap-1.5">
                  <span className="text-indigo-600">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          )}

          {prescription.why_this_prescription.ask_doctor?.length > 0 && (
            <div className="rounded-2xl bg-white/80 p-3 border border-indigo-100">
              <h4 className="text-xs font-extrabold text-indigo-900 flex items-center gap-1 mb-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{mt.askYourDoctor}</span>
              </h4>
              <ul className="space-y-1">
                {prescription.why_this_prescription.ask_doctor.map((q, i) => (
                  <li key={i} className="text-xs font-semibold text-slate-700">
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
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 px-1 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          <span>Medicines on this prescription ({prescription.medicines.length})</span>
        </h3>

        {prescription.medicines.map((med) => (
          <div
            key={med.id}
            onClick={() => onSelectMedicine(med)}
            className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs hover:border-teal-500 cursor-pointer transition flex items-center justify-between gap-3 group"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <Pill className="w-5 h-5" />
              </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-teal-800 truncate">
                      {med.medicine.brand}
                    </h4>
                    {med.verification_status === 'verified' ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900 border border-emerald-200">
                        {mt.sourceVerified}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900 border border-amber-200">
                        {mt.sourceNotVerified}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-0.5 line-clamp-1">
                    {med.purpose}
                  </p>
                  <p className="text-[11px] font-bold text-teal-800 mt-1">
                    {med.how_to_take_as_printed}
                  </p>
                </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-teal-600 shrink-0" />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="rounded-2xl bg-slate-100 border border-slate-200 p-3.5 text-center space-y-1">
        <p className="text-xs font-black text-slate-800">{mt.medicineFooter}</p>
        <p className="text-[11px] font-semibold text-slate-600">{mt.appNotReplaceDoctor}</p>
      </div>
    </div>
  );
};
