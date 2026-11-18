import React, { useState, useEffect } from 'react';
import { ReportAnalysis } from '../types/report';
import { SupportedLanguage, translations } from '../utils/translations';
import { speechService } from '../utils/speech';
import {
  calculateMarkerTrends,
  getStoredReports,
  saveReportToStorage,
  updateReportInStorage,
} from '../utils/storage';
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
  ChevronRight,
  ArrowLeft,
  Loader2,
  Phone,
  Share2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

interface DashboardProps {
  report: ReportAnalysis;
  currentLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onReportUpdated?: (updated: ReportAnalysis) => void;
  onBackToHome: () => void;
}

type ReportMoreRowId =
  | 'normal_tests'
  | 'meaning'
  | 'symptoms'
  | 'urgency'
  | 'safe_steps'
  | 'questions'
  | 'trends';

export const Dashboard: React.FC<DashboardProps> = ({
  report,
  currentLanguage,
  onLanguageChange,
  onReportUpdated,
  onBackToHome,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSaved, setIsSaved] = useState(() =>
    getStoredReports().some((r) => r.id === report.id)
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [openRow, setOpenRow] = useState<ReportMoreRowId | null>(null);

  const t = translations[currentLanguage];

  useEffect(() => {
    setIsSaved(getStoredReports().some((r) => r.id === report.id));
  }, [report.id]);

  useEffect(() => {
    return () => {
      speechService.stop();
    };
  }, []);

  // Automatically fetch translation on-demand if switching language
  useEffect(() => {
    let cancelled = false;

    const needsTranslation = () => {
      if (report.translations?.[currentLanguage]?.report_type) return false;
      const baseMatchesHi = report.translations?.hi?.report_type === report.report_type;
      const baseMatchesOr = report.translations?.or?.report_type === report.report_type;
      if (currentLanguage === 'en' && !baseMatchesHi && !baseMatchesOr) return false;
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
        if (!cancelled) setIsTranslating(false);
      }
    };

    translateNow();
    return () => {
      cancelled = true;
    };
  }, [currentLanguage, report, onReportUpdated]);

  const abnormalFindings = report.findings.filter((f) => f.status !== 'normal');
  const normalFindings = report.findings.filter((f) => f.status === 'normal');
  const trends = calculateMarkerTrends(getStoredReports());

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

  const handleSaveReport = () => {
    const success = saveReportToStorage(report);
    setIsSaved(true);
    setSaveToast(success ? t.savedSuccess : t.reportAlreadySaved);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleToggleReadAloud = () => {
    if (isSpeaking) {
      speechService.stop();
      setIsSpeaking(false);
      return;
    }

    const statusText =
      report.overall_severity === 'green'
        ? `${t.statusGreen}. ${displaySeverityReason}`
        : report.overall_severity === 'yellow'
        ? `${t.statusYellow}. ${displaySeverityReason}`
        : `${t.statusRed}. ${displaySeverityReason}`;

    const findingsSpeech = abnormalFindings
      .map((f) => `${f.translations?.[currentLanguage]?.name || f.name}, ${f.value} ${f.unit || ''}`)
      .join('. ');

    const fullSpeechText = `${displayReportType}. ${statusText}. ${findingsSpeech}. ${t.permanentFooter}`;

    speechService.speak(
      fullSpeechText,
      currentLanguage,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      () => setIsSpeaking(false)
    );
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleShareReport = async () => {
    const abnormalLines = abnormalFindings
      .slice(0, 5)
      .map((f) => {
        const name = f.translations?.[currentLanguage]?.name || f.name;
        return `- ${name}: ${f.value} ${f.unit || ''} (${f.status.toUpperCase()})`;
      })
      .join('\n');
    const summaryText = `${displayReportType}\n${displaySeverityReason}\n${abnormalLines ? `\n${abnormalLines}\n` : ''}\n${t.permanentFooter}\n\n— ${t.shareSignOff}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: displayReportType, text: summaryText });
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

  const handleNextLanguage = () => {
    const nextLang: SupportedLanguage =
      currentLanguage === 'en' ? 'hi' : currentLanguage === 'hi' ? 'or' : 'en';
    onLanguageChange(nextLang);
  };

  const toggleRow = (id: ReportMoreRowId) => {
    setOpenRow((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-16 pt-4 px-4 max-w-xl mx-auto print:p-0 print:max-w-none print:bg-white space-y-6">
      {/* Top Bar: Back + Translate Button */}
      <div className="flex items-center justify-between print:hidden">
        <button
          type="button"
          onClick={() => {
            speechService.stop();
            onBackToHome();
          }}
          className="rs-card inline-flex items-center gap-2 px-4 py-2.5 text-base font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t.backToHome}</span>
        </button>

        <button
          type="button"
          disabled={isTranslating}
          onClick={handleNextLanguage}
          className="rs-card inline-flex items-center gap-2 px-4 py-2.5 text-base font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] transition"
        >
          {isTranslating ? (
            <Loader2 className="w-4 h-4 text-[var(--color-brand)] animate-spin" />
          ) : (
            <Languages className="w-4 h-4 text-[var(--color-brand)]" />
          )}
          <span>
            {currentLanguage === 'en'
              ? 'Translate'
              : currentLanguage === 'hi'
              ? 'हिन्दी'
              : 'ଓଡ଼ିଆ'}
          </span>
        </button>
      </div>

      {/* Toast (brand teal, not health normal green) */}
      {saveToast && (
        <div className="rounded-[16px] bg-[var(--color-brand)] text-white px-4 py-3 text-base font-bold flex items-center justify-center gap-2 shadow-[var(--shadow-card)] print:hidden">
          <Check className="w-5 h-5" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Report Title */}
      <h1 className="text-2xl font-extrabold text-[var(--color-text)] leading-tight">
        {displayReportType}
      </h1>

      {/* 1. BIG TRAFFIC LIGHT + ONE LINE WHY */}
      <div
        className={`rs-card p-5 flex items-center gap-4 ${
          report.overall_severity === 'green'
            ? 'bg-[var(--color-normal-soft)]'
            : report.overall_severity === 'yellow'
            ? 'bg-[var(--color-caution-soft)]'
            : 'bg-[var(--color-danger-soft)]'
        }`}
      >
        <div className="flex flex-col items-center justify-between bg-[var(--color-surface)] p-2 rounded-[14px] shadow-[var(--shadow-card)] gap-2 shrink-0">
          <div
            className={`w-5 h-5 rounded-full ${
              report.overall_severity === 'red'
                ? 'bg-[var(--color-danger)]'
                : 'bg-[var(--color-danger)]/20'
            }`}
          />
          <div
            className={`w-5 h-5 rounded-full ${
              report.overall_severity === 'yellow'
                ? 'bg-[var(--color-caution)]'
                : 'bg-[var(--color-caution)]/20'
            }`}
          />
          <div
            className={`w-5 h-5 rounded-full ${
              report.overall_severity === 'green'
                ? 'bg-[var(--color-normal)]'
                : 'bg-[var(--color-normal)]/20'
            }`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            {report.overall_severity === 'green' ? (
              <CheckCircle2 className="w-6 h-6 text-[var(--color-normal)] shrink-0" />
            ) : report.overall_severity === 'yellow' ? (
              <AlertTriangle className="w-6 h-6 text-[var(--color-caution)] shrink-0" />
            ) : (
              <AlertOctagon className="w-6 h-6 text-[var(--color-danger)] shrink-0" />
            )}
            <h2 className="text-xl font-extrabold text-[var(--color-text)] leading-none">
              {report.overall_severity === 'green'
                ? t.statusGreen
                : report.overall_severity === 'yellow'
                ? t.statusYellow
                : t.statusRed}
            </h2>
          </div>
          <p className="mt-2 text-base text-[var(--color-text)] font-semibold leading-snug line-clamp-2">
            {displaySeverityReason}
          </p>
        </div>
      </div>

      {/* 2. EMERGENCY BANNER (ONLY WHEN SEVERITY IS RED) */}
      {report.overall_severity === 'red' && (
        <div className="rounded-[16px] bg-[var(--color-danger)] text-white p-5 shadow-[var(--shadow-card)] space-y-3">
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-6 h-6 shrink-0" />
            <h3 className="text-lg font-extrabold leading-tight">{t.emergencyBanner}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 print:hidden">
            <a
              href="tel:108"
              className="flex items-center justify-center gap-2 rounded-[12px] bg-white text-[var(--color-danger)] py-2.5 text-base font-extrabold"
            >
              <Phone className="w-4 h-4" />
              <span>108</span>
            </a>
            <a
              href="tel:104"
              className="flex items-center justify-center gap-2 rounded-[12px] bg-black/20 text-white py-2.5 text-base font-extrabold"
            >
              <Phone className="w-4 h-4" />
              <span>104</span>
            </a>
          </div>
        </div>
      )}

      {/* 3. BODY MAP WITH HIGHLIGHTED AREA */}
      <BodyMap
        affectedRegions={report.body_regions_affected}
        findings={report.findings}
        overallSeverity={report.overall_severity}
        language={currentLanguage}
      />

      {/* 4. ABNORMAL FINDINGS (Value + Simple Bar) */}
      {abnormalFindings.length > 0 && (
        <div className="space-y-3">
          {abnormalFindings.map((finding) => (
            <FindingGauge key={finding.id} finding={finding} language={currentLanguage} />
          ))}
        </div>
      )}

      {/* TWO ROUND BUTTONS (Read aloud & Save) + ONE MORE DETAILS BUTTON */}
      <div className="space-y-5 pt-1 print:hidden">
        <div className="flex items-center justify-center gap-12">
          {speechService.isAvailable() && (
            <button
              type="button"
              onClick={handleToggleReadAloud}
              className="flex flex-col items-center gap-2"
            >
              <span
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[var(--shadow-card)] transition ${
                  isSpeaking
                    ? 'bg-[var(--color-text)] text-white'
                    : 'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]'
                }`}
              >
                {isSpeaking ? <VolumeX className="w-7 h-7" /> : <Volume2 className="w-7 h-7" />}
              </span>
              <span className="text-base font-bold text-[var(--color-text)]">
                {isSpeaking ? 'Stop' : 'Read aloud'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveReport}
            className="flex flex-col items-center gap-2"
          >
            <span
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[var(--shadow-card)] transition ${
                isSaved
                  ? 'bg-[var(--color-brand)] text-white'
                  : 'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]'
              }`}
            >
              {isSaved ? <Check className="w-7 h-7" /> : <Bookmark className="w-7 h-7" />}
            </span>
            <span className="text-base font-bold text-[var(--color-text)]">
              {isSaved ? 'Saved' : 'Save'}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowMore((prev) => !prev)}
          className="rs-card w-full py-4 px-5 text-base font-extrabold text-[var(--color-text)] flex items-center justify-center gap-2 hover:bg-[var(--color-surface-subtle)] transition"
        >
          <span>
            {currentLanguage === 'hi'
              ? 'और जानकारी'
              : currentLanguage === 'or'
              ? 'ଅଧିକ ସୂଚନା'
              : 'More details'}
          </span>
          {showMore ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* MORE DETAILS (Collapsed rows: symptoms, steps, questions for doctor, trend chart, etc.) */}
      {showMore && (
        <div className="rs-card divide-y divide-[var(--color-divider)] overflow-hidden print:hidden">
          {normalFindings.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => toggleRow('normal_tests')}
                className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)]"
              >
                <span className="truncate">
                  {t.everythingElseNormal} ({normalFindings.length})
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-[var(--color-text-secondary)] shrink-0 transition ${
                    openRow === 'normal_tests' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openRow === 'normal_tests' && (
                <div className="px-5 pb-4 space-y-2.5">
                  {normalFindings.map((finding) => (
                    <FindingGauge key={finding.id} finding={finding} language={currentLanguage} />
                  ))}
                </div>
              )}
            </div>
          )}

          {abnormalFindings.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => toggleRow('meaning')}
                className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)]"
              >
                <span className="truncate">{t.whatThisMeans}</span>
                <ChevronDown
                  className={`w-5 h-5 text-[var(--color-text-secondary)] shrink-0 transition ${
                    openRow === 'meaning' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openRow === 'meaning' && (
                <div className="px-5 pb-4 space-y-2 text-base text-[var(--color-text)]">
                  {abnormalFindings.map((f) => (
                    <p key={f.id}>
                      <span className="font-bold">
                        {f.translations?.[currentLanguage]?.name || f.name}:{' '}
                      </span>
                      {f.translations?.[currentLanguage]?.short_explanation || f.short_explanation}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {displaySymptoms.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => toggleRow('symptoms')}
                className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)]"
              >
                <span className="truncate">{t.symptomsToWatch}</span>
                <ChevronDown
                  className={`w-5 h-5 text-[var(--color-text-secondary)] shrink-0 transition ${
                    openRow === 'symptoms' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openRow === 'symptoms' && (
                <div className="px-5 pb-4 space-y-1.5 text-base text-[var(--color-text)] font-medium">
                  {displaySymptoms.map((s, i) => (
                    <p key={i}>• {s}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={() => toggleRow('urgency')}
              className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)]"
            >
              <span className="truncate">{t.howUrgent}</span>
              <ChevronDown
                className={`w-5 h-5 text-[var(--color-text-secondary)] shrink-0 transition ${
                  openRow === 'urgency' ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openRow === 'urgency' && (
              <div className="px-5 pb-4 text-base font-bold text-[var(--color-text)]">
                {report.urgency === 'today'
                  ? t.urgencyToday
                  : report.urgency === 'soon'
                  ? t.urgencySoon
                  : t.urgencyRoutine}
              </div>
            )}
          </div>

          {displaySafeSteps.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => toggleRow('safe_steps')}
                className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)]"
              >
                <span className="truncate">{t.whatYouCanDo}</span>
                <ChevronDown
                  className={`w-5 h-5 text-[var(--color-text-secondary)] shrink-0 transition ${
                    openRow === 'safe_steps' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openRow === 'safe_steps' && (
                <div className="px-5 pb-4 space-y-1.5 text-base text-[var(--color-text)] font-medium">
                  {displaySafeSteps.map((s, i) => (
                    <p key={i}>✓ {s}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {displayDoctorQuestions.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => toggleRow('questions')}
                className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)]"
              >
                <span className="truncate">{t.doctorQuestions}</span>
                <ChevronDown
                  className={`w-5 h-5 text-[var(--color-text-secondary)] shrink-0 transition ${
                    openRow === 'questions' ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openRow === 'questions' && (
                <div className="px-5 pb-4 space-y-1.5 text-base text-[var(--color-text)] font-medium">
                  {displayDoctorQuestions.map((q, i) => (
                    <p key={i}>
                      {i + 1}. {q}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Trend Chart Row */}
          <div>
            <button
              type="button"
              onClick={() => toggleRow('trends')}
              className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)]"
            >
              <span className="truncate">{t.trendTitle}</span>
              <ChevronDown
                className={`w-5 h-5 text-[var(--color-text-secondary)] shrink-0 transition ${
                  openRow === 'trends' ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openRow === 'trends' && (
              <div className="px-5 pb-4 space-y-3">
                {trends.length === 0 ? (
                  <p className="text-base text-[var(--color-text-secondary)]">
                    Save 2+ reports to compare trends.
                  </p>
                ) : (
                  trends.map((tr, idx) => {
                    const minVal = Math.min(...tr.history.map((h) => h.value));
                    const maxVal = Math.max(...tr.history.map((h) => h.value));
                    const range = maxVal - minVal || 1;
                    const svgPoints = tr.history
                      .map((pt, i) => {
                        const x = 10 + (i / (tr.history.length - 1 || 1)) * 140;
                        const y = 35 - ((pt.value - minVal) / range) * 25;
                        return `${x},${y}`;
                      })
                      .join(' ');

                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-base">
                          <span className="font-bold text-[var(--color-text)]">
                            {tr.markerName}
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-bold text-[var(--color-text)]">
                            {tr.direction === 'better' ? (
                              <TrendingDown className="w-4 h-4 text-[var(--color-normal)]" />
                            ) : tr.direction === 'worse' ? (
                              <TrendingUp className="w-4 h-4 text-[var(--color-danger)]" />
                            ) : (
                              <Minus className="w-4 h-4 text-[var(--color-text-secondary)]" />
                            )}
                            <span>{tr.changeSummary}</span>
                          </span>
                        </div>
                        <svg viewBox="0 0 160 40" className="w-40 h-9 overflow-visible">
                          <polyline
                            fill="none"
                            stroke="#0F766E"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={svgPoints}
                          />
                        </svg>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Print / PDF */}
          <button
            type="button"
            onClick={handlePrintPdf}
            className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)] hover:bg-[var(--color-bg)] transition"
          >
            <span className="flex items-center gap-2.5">
              <Printer className="w-5 h-5 text-[var(--color-brand)]" />
              <span>{t.downloadPdf}</span>
            </span>
            <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShareReport}
            className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)] hover:bg-[var(--color-bg)] transition"
          >
            <span className="flex items-center gap-2.5">
              <Share2 className="w-5 h-5 text-[var(--color-brand)]" />
              <span>Share</span>
            </span>
            <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        </div>
      )}

      {/* Tiny Footer */}
      <p className="text-center text-sm font-medium text-[var(--color-text-secondary)] pt-2">
        {t.permanentFooter}
      </p>
    </div>
  );
};
