import React, { useState, useEffect } from 'react';
import { ReportAnalysis } from '../types/report';
import { SupportedLanguage, translations } from '../utils/translations';
import { speechService } from '../utils/speech';
import { saveReportToStorage, updateReportInStorage } from '../utils/storage';
import { BodyMap } from './BodyMap';
import { FindingGauge } from './FindingGauge';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Volume2,
  VolumeX,
  Languages,
  Printer,
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldCheck,
  HelpCircle,
  Activity,
  ArrowLeft,
  Calendar,
  Loader2,
  Phone,
  Share2,
} from 'lucide-react';

interface DashboardProps {
  report: ReportAnalysis;
  currentLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onReportUpdated?: (updated: ReportAnalysis) => void;
  onBackToHome: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  report,
  currentLanguage,
  onLanguageChange,
  onReportUpdated,
  onBackToHome,
}) => {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [showNormalTests, setShowNormalTests] = useState<boolean>(false);

  const t = translations[currentLanguage];

  // Stop speech when unmounting
  useEffect(() => {
    return () => {
      speechService.stop();
    };
  }, []);

  // Automatically fetch translation on-demand if switching to a language not yet cached on this report
  useEffect(() => {
    let cancelled = false;

    const needsTranslation = () => {
      // Already has cached translation for currentLanguage
      if (report.translations?.[currentLanguage]?.report_type) {
        return false;
      }
      // Demo reports or English-scanned reports have English as base fields
      const baseMatchesHi = report.translations?.hi?.report_type === report.report_type;
      const baseMatchesOr = report.translations?.or?.report_type === report.report_type;
      if (currentLanguage === 'en' && !baseMatchesHi && !baseMatchesOr) {
        return false;
      }
      return true;
    };

    const translateNow = async () => {
      if (!needsTranslation()) return;
      setIsTranslating(true);
      try {
        const res = await fetch('/api/translate-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ report, targetLanguage: currentLanguage }),
        });
        const raw = await res.text();
        const data = JSON.parse(raw);
        if (!cancelled && res.ok && data.success && data.translation) {
          const tr = data.translation;
          const findingMap = new Map<string, { name?: string; short_explanation?: string }>();
          if (Array.isArray(tr.findings)) {
            for (const f of tr.findings) {
              findingMap.set(f.id, f);
            }
          }

          const updatedReport: ReportAnalysis = {
            ...report,
            translations: {
              ...report.translations,
              [currentLanguage]: {
                report_type: tr.report_type,
                severity_reason: tr.severity_reason,
                symptoms_to_watch: tr.symptoms_to_watch,
                safe_steps: tr.safe_steps,
                doctor_questions: tr.doctor_questions,
              },
            },
            findings: report.findings.map((f) => {
              const matched = findingMap.get(f.id);
              return {
                ...f,
                translations: {
                  ...f.translations,
                  [currentLanguage]: {
                    name: matched?.name || f.name,
                    short_explanation: matched?.short_explanation || f.short_explanation,
                  },
                },
              };
            }),
          };

          updateReportInStorage(updatedReport);
          onReportUpdated?.(updatedReport);
        }
      } catch (err) {
        console.warn('On-demand translation skipped:', err);
      } finally {
        if (!cancelled) {
          setIsTranslating(false);
        }
      }
    };

    translateNow();
    return () => {
      cancelled = true;
    };
  }, [currentLanguage, report, onReportUpdated]);

  // Separate abnormal vs normal findings
  const abnormalFindings = report.findings.filter((f) => f.status !== 'normal');
  const normalFindings = report.findings.filter((f) => f.status === 'normal');

  // Localized texts
  const displayReportType =
    report.translations?.[currentLanguage]?.report_type || report.report_type;

  const displaySeverityReason =
    report.translations?.[currentLanguage]?.severity_reason || report.severity_reason;

  const displaySymptoms =
    report.translations?.[currentLanguage]?.symptoms_to_watch || report.symptoms_to_watch;

  const displaySafeSteps =
    report.translations?.[currentLanguage]?.safe_steps || report.safe_steps;

  const displayDoctorQuestions =
    report.translations?.[currentLanguage]?.doctor_questions || report.doctor_questions;

  // Handle Save Report
  const handleSaveReport = () => {
    const success = saveReportToStorage(report);
    setIsSaved(true);
    setSaveToast(success ? t.savedSuccess : t.reportAlreadySaved);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Handle Text-to-Speech Read Aloud
  const handleToggleReadAloud = () => {
    if (isSpeaking) {
      speechService.stop();
      setIsSpeaking(false);
      return;
    }

    // Build speech script in simple sentences
    const intro = `${t.appName}. ${displayReportType}.`;
    const statusText =
      report.overall_severity === 'green'
        ? `${t.statusGreen}. ${displaySeverityReason}`
        : report.overall_severity === 'yellow'
        ? `${t.statusYellow}. ${displaySeverityReason}`
        : `${t.statusRed}. ${displaySeverityReason}`;

    const findingsSpeech = abnormalFindings
      .map((f) => {
        const fName = f.translations?.[currentLanguage]?.name || f.name;
        const fExpl = f.translations?.[currentLanguage]?.short_explanation || f.short_explanation;
        return `${fName}. ${fExpl}`;
      })
      .join('. ');

    const stepsSpeech = displaySafeSteps.length > 0 ? `${t.whatYouCanDo}: ${displaySafeSteps.join('. ')}` : '';

    const fullSpeechText = `${intro}. ${statusText}. ${findingsSpeech}. ${stepsSpeech}. ${t.permanentFooter}`;

    speechService.speak(
      fullSpeechText,
      currentLanguage,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      () => setIsSpeaking(false)
    );
  };

  // Handle PDF Print
  const handlePrintPdf = () => {
    window.print();
  };

  // Handle Share / Copy Report Summary
  const handleShareReport = async () => {
    const abnormalLines = abnormalFindings
      .slice(0, 5)
      .map((f) => {
        const name = f.translations?.[currentLanguage]?.name || f.name;
        return `- ${name}: ${f.value} ${f.unit || ''} (${f.status.toUpperCase()})`;
      })
      .join('\n');
    const summaryText = `${displayReportType}\n${displaySeverityReason}\n${abnormalLines ? `\n${abnormalLines}\n` : ''}\n${t.permanentFooter}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: displayReportType,
          text: summaryText,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(summaryText);
        setSaveToast(
          currentLanguage === 'hi'
            ? 'सारांश कॉपी हो गया!'
            : currentLanguage === 'or'
            ? 'ସାରାଂଶ କପି ହୋଇଗଲା!'
            : 'Summary copied!'
        );
        setTimeout(() => setSaveToast(null), 2500);
      }
    } catch {
      // User cancelled share
    }
  };

  // Cycle languages: en -> hi -> or -> en
  const handleNextLanguage = () => {
    const nextLang: SupportedLanguage =
      currentLanguage === 'en' ? 'hi' : currentLanguage === 'hi' ? 'or' : 'en';
    onLanguageChange(nextLang);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28 pt-3 px-4 max-w-xl mx-auto print:p-0 print:max-w-none print:bg-white">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 print:hidden">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 shadow-xs hover:bg-slate-100 transition active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.backToHome}</span>
        </button>

        {/* Date and type tag */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{new Date(report.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Floating Save Toast */}
      {saveToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-xs font-bold shadow-2xl flex items-center gap-2 border border-slate-700 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Report Header Title */}
      <div className="mb-4">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-100/70 px-2.5 py-1 rounded-md">
          {displayReportType}
        </span>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5 leading-tight">
          {displayReportType}
        </h1>
        {(report.patient_age || report.patient_gender) && (
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Patient:{' '}
            {report.patient_age ? `${report.patient_age} yrs` : ''}{' '}
            {report.patient_gender ? `• ${report.patient_gender}` : ''}
          </p>
        )}
      </div>

      <div className="space-y-4">
        {/* ============================================================ */}
        {/* 5a. OVERALL STATUS CARD: BIG TRAFFIC LIGHT                   */}
        {/* ============================================================ */}
        <div
          className={`rounded-3xl p-5 shadow-sm border transition-all ${
            report.overall_severity === 'green'
              ? 'bg-emerald-500/10 border-emerald-300'
              : report.overall_severity === 'yellow'
              ? 'bg-amber-500/10 border-amber-300'
              : 'bg-rose-500/15 border-rose-400 ring-2 ring-rose-200'
          }`}
        >
          <div className="flex items-center gap-4">
            {/* Physical-style Traffic Light Box */}
            <div className="flex flex-col items-center justify-between bg-slate-950 p-2 rounded-2xl shadow-inner gap-2 border border-slate-800 shrink-0">
              {/* Red Light */}
              <div
                className={`w-5 h-5 rounded-full transition-all ${
                  report.overall_severity === 'red'
                    ? 'bg-rose-500 shadow-[0_0_12px_#ef4444] animate-pulse ring-2 ring-white/60'
                    : 'bg-rose-950/60 opacity-40'
                }`}
              />
              {/* Yellow Light */}
              <div
                className={`w-5 h-5 rounded-full transition-all ${
                  report.overall_severity === 'yellow'
                    ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b] animate-pulse ring-2 ring-white/60'
                    : 'bg-amber-950/60 opacity-40'
                }`}
              />
              {/* Green Light */}
              <div
                className={`w-5 h-5 rounded-full transition-all ${
                  report.overall_severity === 'green'
                    ? 'bg-emerald-500 shadow-[0_0_12px_#10b981] ring-2 ring-white/60'
                    : 'bg-emerald-950/60 opacity-40'
                }`}
              />
            </div>

            {/* Status Information */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {report.overall_severity === 'green' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : report.overall_severity === 'yellow' ? (
                  <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                ) : (
                  <AlertOctagon className="w-6 h-6 text-rose-600 shrink-0" />
                )}
                <h2 className="text-xl font-black text-slate-900 leading-none">
                  {report.overall_severity === 'green'
                    ? t.statusGreen
                    : report.overall_severity === 'yellow'
                    ? t.statusYellow
                    : t.statusRed}
                </h2>
              </div>

              {/* 1 Short line explaining why - NO score or percentage */}
              <p className="mt-2 text-sm text-slate-800 font-semibold leading-snug">
                {displaySeverityReason}
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 5b. RED EMERGENCY BANNER (ONLY WHEN SEVERE)                  */}
        {/* ============================================================ */}
        {report.overall_severity === 'red' && (
          <div className="rounded-2xl bg-rose-600 text-white p-4 shadow-lg border-2 border-rose-700 space-y-3">
            <div className="flex items-center gap-3.5">
              <div className="rounded-xl bg-white/20 p-2 shrink-0">
                <AlertOctagon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight leading-tight">
                  {t.emergencyBanner}
                </h3>
                <p className="text-xs text-rose-100 font-medium mt-0.5">
                  {t.emergencySub}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 print:hidden">
              <a
                href="tel:108"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-white text-rose-800 py-2 px-3 text-xs font-black shadow-xs hover:bg-rose-50 transition"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>
                  {currentLanguage === 'hi'
                    ? '108 एम्बुलेंस'
                    : currentLanguage === 'or'
                    ? '108 ଆମ୍ବୁଲାନ୍ସ'
                    : 'Call 108 Ambulance'}
                </span>
              </a>
              <a
                href="tel:104"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-800 text-white border border-rose-400/50 py-2 px-3 text-xs font-black shadow-xs hover:bg-rose-900 transition"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>
                  {currentLanguage === 'hi'
                    ? '104 स्वास्थ्य हेल्पलाइन'
                    : currentLanguage === 'or'
                    ? '104 ସ୍ୱାସ୍ଥ୍ୟ ହେଲ୍ପଲାଇନ୍'
                    : 'Call 104 Helpline'}
                </span>
              </a>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 5c. BODY MAP: CLEAN SVG DIAGRAM                              */}
        {/* ============================================================ */}
        <BodyMap
          affectedRegions={report.body_regions_affected}
          findings={report.findings}
          overallSeverity={report.overall_severity}
          language={currentLanguage}
        />

        {/* ============================================================ */}
        {/* 5d. FINDINGS LIST: ABNORMAL CARDS + COLLAPSED NORMAL ROW     */}
        {/* ============================================================ */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-teal-600" />
              <span>{t.findingsTitle}</span>
            </h3>
            <span className="text-xs text-slate-500 font-semibold">
              {abnormalFindings.length} {abnormalFindings.length === 1 ? 'Alert' : 'Alerts'}
            </span>
          </div>

          {/* Abnormal Cards */}
          {abnormalFindings.map((finding) => (
            <FindingGauge key={finding.id} finding={finding} language={currentLanguage} />
          ))}

          {/* Collapsed "Everything else is normal" row */}
          {normalFindings.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5">
              <button
                type="button"
                onClick={() => setShowNormalTests((prev) => !prev)}
                className="w-full flex items-center justify-between text-left transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-950">
                      {t.everythingElseNormal}
                    </span>
                    <span className="block text-[11px] text-emerald-700">
                      ({normalFindings.length} {normalFindings.length === 1 ? 'test' : 'tests'} healthy)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-emerald-800">
                  <span>{showNormalTests ? t.hideNormalTests : t.viewNormalTests}</span>
                  {showNormalTests ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              {/* Expanded Normal Findings */}
              {showNormalTests && (
                <div className="mt-3 space-y-2.5 pt-3 border-t border-emerald-200/80">
                  {normalFindings.map((finding) => (
                    <FindingGauge key={finding.id} finding={finding} language={currentLanguage} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* 5e. "WHAT THIS MAY MEAN"                                     */}
        {/* ============================================================ */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-teal-800 mb-2">
            {t.whatThisMeans}
          </h3>
          <div className="space-y-2">
            {abnormalFindings.length > 0 ? (
              abnormalFindings.map((f) => (
                <div key={f.id} className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed font-medium">
                  <span className="font-bold text-slate-900 block">
                    {f.translations?.[currentLanguage]?.name || f.name}
                  </span>
                  <span>
                    {f.translations?.[currentLanguage]?.short_explanation || f.short_explanation}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-700 font-medium">
                Your report shows all measured values appear healthy and within normal boundaries.
              </p>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 5f. SYMPTOMS TO WATCH FOR                                    */}
        {/* ============================================================ */}
        {displaySymptoms.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-900 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>{t.symptomsToWatch}</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-800 font-medium">
              {displaySymptoms.map((sym, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-white/70 p-2 rounded-lg border border-amber-100">
                  <span className="text-amber-600 font-bold shrink-0">•</span>
                  <span>{sym}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ============================================================ */}
        {/* 5g. HOW URGENT                                               */}
        {/* ============================================================ */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              {t.howUrgent}
            </span>
            <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
              {report.urgency === 'today'
                ? t.urgencyToday
                : report.urgency === 'soon'
                ? t.urgencySoon
                : t.urgencyRoutine}
            </span>
          </div>

          <div
            className={`p-2.5 rounded-2xl ${
              report.urgency === 'today'
                ? 'bg-rose-100 text-rose-700'
                : report.urgency === 'soon'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* ============================================================ */}
        {/* 5h. WHAT YOU CAN DO (SAFE STEPS ONLY)                        */}
        {/* ============================================================ */}
        {displaySafeSteps.length > 0 && (
          <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 shadow-xs">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-teal-900 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>{t.whatYouCanDo}</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-800 font-medium">
              {displaySafeSteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-white/80 p-2 rounded-lg border border-teal-100">
                  <span className="text-teal-600 font-bold shrink-0">✓</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ============================================================ */}
        {/* 5i. QUESTIONS TO ASK YOUR DOCTOR                             */}
        {/* ============================================================ */}
        {displayDoctorQuestions.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-900 mb-2 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <span>{t.doctorQuestions}</span>
            </h3>
            <div className="space-y-2 text-xs text-slate-800">
              {displayDoctorQuestions.map((q, idx) => (
                <div key={idx} className="flex items-start gap-2.5 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100 font-medium">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-200 text-indigo-900 text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span>{q}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 5j. ACTION BUTTONS: PDF, TRANSLATE, READ ALOUD, SAVE         */}
        {/* ============================================================ */}
        <div className="pt-2 grid grid-cols-2 gap-2.5 print:hidden">
          {/* Read Aloud Button */}
          <button
            type="button"
            onClick={handleToggleReadAloud}
            className={`flex items-center justify-center gap-2 rounded-2xl py-3 px-3 text-xs font-bold transition active:scale-95 ${
              isSpeaking
                ? 'bg-amber-600 text-white shadow-md animate-pulse'
                : 'bg-white border-2 border-slate-200 text-slate-800 hover:bg-slate-100'
            }`}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-4 h-4 text-white" />
                <span>{t.stopReadAloud}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-teal-700" />
                <span>{t.readAloud}</span>
              </>
            )}
          </button>

          {/* Translate Button */}
          <button
            type="button"
            disabled={isTranslating}
            onClick={handleNextLanguage}
            className="flex items-center justify-center gap-2 rounded-2xl py-3 px-3 text-xs font-bold bg-white border-2 border-slate-200 text-slate-800 hover:bg-slate-100 transition active:scale-95 disabled:opacity-70"
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-4 h-4 text-teal-700 animate-spin" />
                <span>Translating...</span>
              </>
            ) : (
              <>
                <Languages className="w-4 h-4 text-teal-700" />
                <span>
                  {currentLanguage === 'en'
                    ? 'हिन्दी में बदलें'
                    : currentLanguage === 'hi'
                    ? 'ଓଡ଼ିଆରେ ଦେଖନ୍ତୁ'
                    : 'Switch to English'}
                </span>
              </>
            )}
          </button>

          {/* Download / Print PDF */}
          <button
            type="button"
            onClick={handlePrintPdf}
            className="flex items-center justify-center gap-2 rounded-2xl py-3 px-3 text-xs font-bold bg-white border-2 border-slate-200 text-slate-800 hover:bg-slate-100 transition active:scale-95"
          >
            <Printer className="w-4 h-4 text-teal-700" />
            <span>{t.downloadPdf}</span>
          </button>

          {/* Save Report */}
          <button
            type="button"
            onClick={handleSaveReport}
            className={`flex items-center justify-center gap-2 rounded-2xl py-3 px-3 text-xs font-bold transition active:scale-95 ${
              isSaved
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-teal-700 text-white hover:bg-teal-800 shadow-md'
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4" />
                <span>{t.savedSuccess}</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4" />
                <span>{t.saveReport}</span>
              </>
            )}
          </button>

          {/* Share Summary with Family / Doctor */}
          <button
            type="button"
            onClick={handleShareReport}
            className="col-span-2 flex items-center justify-center gap-2 rounded-2xl py-3 px-3 text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-900 hover:bg-indigo-100 transition active:scale-95"
          >
            <Share2 className="w-4 h-4 text-indigo-700" />
            <span>
              {currentLanguage === 'hi'
                ? 'परिवार या डॉक्टर को शेयर करें'
                : currentLanguage === 'or'
                ? 'ପରିବାର ବା ଡାକ୍ତରଙ୍କୁ ସେୟାର କରନ୍ତୁ'
                : 'Share Summary with Family / Doctor'}
            </span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* 5k. PERMANENT VISIBLE FOOTER                                 */}
        {/* ============================================================ */}
        <div className="mt-8 rounded-2xl bg-amber-50 border border-amber-300 p-3.5 text-center shadow-xs">
          <p className="text-xs font-bold text-amber-950 leading-snug">
            {t.permanentFooter}
          </p>
        </div>
      </div>
    </div>
  );
};
