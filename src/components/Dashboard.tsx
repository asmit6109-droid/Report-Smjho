import React, { useState, useEffect, useMemo } from 'react';
import { CombinedReportData, ReportAnalysis, ReportGroup } from '../types/report';
import { SupportedLanguage, translations } from '../utils/translations';
import { speechService } from '../utils/speech';
import {
  calculateMarkerTrends,
  deleteReportGroup,
  getStoredReports,
  renameReportGroup,
  saveReportGroup,
  saveReportToStorage,
  updateReportInStorage,
} from '../utils/storage';
import { buildBodyRegionSummaries } from '../utils/bodyMapper';
import { buildFullPdfPayload, PdfReportPayload } from '../utils/pdfReportData';
import { BodyMap } from './BodyMap';
import { FindingGauge } from './FindingGauge';
import { ReportExportModal } from './ReportExportModal';
import { PrintReportSheet } from './PrintReportSheet';
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
  FilePlus2,
  Layers,
  RefreshCw,
  Edit2,
  FolderMinus,
} from 'lucide-react';

export interface FailedAppendPage {
  id: string;
  pageNumber: number;
  imageDataUrl: string;
}

interface DashboardProps {
  report: ReportAnalysis;
  combinedData?: CombinedReportData | null;
  currentLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onReportUpdated?: (updated: ReportAnalysis) => void;
  onCombinedGroupChange?: (nextGroup: { groupId?: string; groupName?: string } | null) => void;
  onAddMorePages?: () => void;
  failedAppendPages?: FailedAppendPage[];
  onRetryFailedPage?: (page: FailedAppendPage) => void;
  onDismissFailedPage?: (pageId: string) => void;
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
  combinedData = null,
  currentLanguage,
  onLanguageChange,
  onReportUpdated,
  onCombinedGroupChange,
  onAddMorePages,
  failedAppendPages = [],
  onRetryFailedPage,
  onDismissFailedPage,
  onBackToHome,
}) => {
  const [selectedScanIndex, setSelectedScanIndex] = useState<'all' | number>('all');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [openRow, setOpenRow] = useState<ReportMoreRowId | null>(null);
  const [focusedFindingId, setFocusedFindingId] = useState<string | null>(null);

  // Report Group save / rename UI states
  const [showSaveGroupInput, setShowSaveGroupInput] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [isRenamingGroup, setIsRenamingGroup] = useState(false);

  // Full PDF / Print Export Modal & A4 Print Payload
  const [showExportModal, setShowExportModal] = useState(false);
  const [customPrintPayload, setCustomPrintPayload] = useState<PdfReportPayload | null>(null);

  const isCombinedMode = Boolean(combinedData && combinedData.scans.length > 0);
  const activeViewReport: ReportAnalysis =
    isCombinedMode && combinedData && selectedScanIndex !== 'all'
      ? combinedData.scans[selectedScanIndex]?.report || report
      : combinedData
      ? combinedData.merged
      : report;

  const [isSaved, setIsSaved] = useState(() =>
    getStoredReports().some((r) => r.id === activeViewReport.id)
  );

  const t = translations[currentLanguage];

  const ui = {
    allCombined:
      currentLanguage === 'hi'
        ? 'सभी मिलाकर'
        : currentLanguage === 'or'
        ? 'ସବୁ ମିଶାଇ'
        : 'All Combined',
    addMorePages:
      currentLanguage === 'hi'
        ? 'और पन्ने जोड़ें'
        : currentLanguage === 'or'
        ? 'ଆଉ ପୃଷ୍ଠା ଯୋଡନ୍ତୁ'
        : 'Add more pages',
    saveAsGroup:
      currentLanguage === 'hi'
        ? 'ग्रुप के रूप में सेव करें'
        : currentLanguage === 'or'
        ? 'ଗୋଷ୍ଠୀ ଭାବେ ସେଭ୍ କରନ୍ତୁ'
        : 'Save as report group',
    groupPlaceholder:
      currentLanguage === 'hi'
        ? 'नाम लिखें (जैसे: ब्लड टेस्ट 12 नव.)'
        : currentLanguage === 'or'
        ? 'ନାମ ଲେଖନ୍ତୁ (ଯଥା: ବ୍ଲଡ୍ ଟେଷ୍ଟ)'
        : 'e.g. Blood test 12 Nov',
    mismatchText:
      currentLanguage === 'hi'
        ? 'ये रिपोर्ट अलग-अलग व्यक्ति या तारीख की लग रही हैं। कृपया जांच लें।'
        : currentLanguage === 'or'
        ? 'ଏହି ରିପୋର୍ଟଗୁଡ଼ିକ ଅଲଗା ବ୍ୟକ୍ତି କିମ୍ବା ତାରିଖର ପରି ଲାଗୁଛି। ଦୟାକରି ଯାଞ୍ଚ କରନ୍ତୁ।'
        : 'These reports look like they are from different people or dates. Please check.',
    otherFindings:
      currentLanguage === 'hi'
        ? 'अन्य जांच'
        : currentLanguage === 'or'
        ? 'ଅନ୍ୟାନ୍ୟ ପରୀକ୍ଷା'
        : 'Other findings',
    groupSavedToast:
      currentLanguage === 'hi'
        ? 'रिपोर्ट ग्रुप सेव हो गया!'
        : currentLanguage === 'or'
        ? 'ରିପୋର୍ଟ ଗୋଷ୍ଠୀ ସେଭ୍ ହୋଇଗଲା!'
        : 'Report group saved!',
  };

  useEffect(() => {
    setSelectedScanIndex('all');
    setShowSaveGroupInput(false);
    setIsRenamingGroup(false);
    setGroupNameInput(
      combinedData?.groupName ||
        `Report ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
    );
  }, [combinedData?.merged.id, combinedData?.groupName]);

  useEffect(() => {
    setIsSaved(getStoredReports().some((r) => r.id === activeViewReport.id));
  }, [activeViewReport.id]);

  useEffect(() => {
    return () => {
      speechService.stop();
    };
  }, []);

  // Automatically fetch translation on-demand if switching language (for single reports or selected individual scans)
  useEffect(() => {
    let cancelled = false;

    const needsTranslation = () => {
      if (activeViewReport.translations?.[currentLanguage]?.report_type) return false;
      const baseMatchesHi =
        activeViewReport.translations?.hi?.report_type === activeViewReport.report_type;
      const baseMatchesOr =
        activeViewReport.translations?.or?.report_type === activeViewReport.report_type;
      if (currentLanguage === 'en' && !baseMatchesHi && !baseMatchesOr) return false;
      if (isCombinedMode && selectedScanIndex === 'all') return false;
      return true;
    };

    const translateNow = async () => {
      if (!needsTranslation()) return;
      setIsTranslating(true);
      try {
        const res = await fetch('/api/translate-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ report: activeViewReport, targetLanguage: currentLanguage }),
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
            ...activeViewReport,
            translations: {
              ...activeViewReport.translations,
              [currentLanguage]: {
                report_type: tr.report_type,
                severity_reason: tr.severity_reason,
                symptoms_to_watch: tr.symptoms_to_watch,
                safe_steps: tr.safe_steps,
                doctor_questions: tr.doctor_questions,
              },
            },
            findings: activeViewReport.findings.map((f) => {
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
  }, [currentLanguage, activeViewReport, isCombinedMode, selectedScanIndex, onReportUpdated]);

  const abnormalFindings = activeViewReport.findings.filter((f) => f.status !== 'normal');
  const normalFindings = activeViewReport.findings.filter((f) => f.status === 'normal');

  const bodySummary = useMemo(
    () =>
      buildBodyRegionSummaries(
        activeViewReport.findings,
        activeViewReport.report_type,
        currentLanguage
      ),
    [activeViewReport.findings, activeViewReport.report_type, currentLanguage]
  );

  // Separate mapped abnormal findings from unmapped "Other findings"
  const mappedAbnormalFindings = abnormalFindings.filter(
    (f) => bodySummary.mappedRegionIdsForFinding[f.id] !== null
  );
  const unmappedAbnormalFindings = abnormalFindings.filter(
    (f) => bodySummary.mappedRegionIdsForFinding[f.id] === null
  );

  const trends = calculateMarkerTrends(getStoredReports());

  const displayReportType =
    activeViewReport.translations?.[currentLanguage]?.report_type || activeViewReport.report_type;
  const displaySeverityReason =
    activeViewReport.translations?.[currentLanguage]?.severity_reason ||
    activeViewReport.severity_reason;
  const displaySymptoms =
    activeViewReport.translations?.[currentLanguage]?.symptoms_to_watch ||
    activeViewReport.symptoms_to_watch;
  const displaySafeSteps =
    activeViewReport.translations?.[currentLanguage]?.safe_steps || activeViewReport.safe_steps;
  const displayDoctorQuestions =
    activeViewReport.translations?.[currentLanguage]?.doctor_questions ||
    activeViewReport.doctor_questions;

  const handleSaveReport = () => {
    if (isCombinedMode && selectedScanIndex === 'all') {
      setShowSaveGroupInput(true);
      return;
    }
    const success = saveReportToStorage(activeViewReport);
    setIsSaved(true);
    setSaveToast(success ? t.savedSuccess : t.reportAlreadySaved);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleConfirmSaveGroup = () => {
    if (!combinedData) return;
    const cleanName =
      groupNameInput.trim() ||
      `Report ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
    const groupId = combinedData.groupId || `grp-${Date.now()}`;
    // Ensure underlying scans exist in storage so group always resolves cleanly
    combinedData.scans.forEach((s) => saveReportToStorage(s.report));

    const newGroup: ReportGroup = {
      id: groupId,
      name: cleanName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      reportIds: combinedData.scans.map((s) => s.report.id),
      isDemo: combinedData.isDemo,
    };
    saveReportGroup(newGroup);
    onCombinedGroupChange?.({ groupId, groupName: cleanName });
    setShowSaveGroupInput(false);
    setIsRenamingGroup(false);
    setSaveToast(ui.groupSavedToast);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleCommitGroupRename = () => {
    if (!combinedData?.groupId) return;
    const cleanName = groupNameInput.trim() || combinedData.groupName || 'Report Group';
    renameReportGroup(combinedData.groupId, cleanName);
    onCombinedGroupChange?.({ groupId: combinedData.groupId, groupName: cleanName });
    setIsRenamingGroup(false);
    setSaveToast(ui.groupSavedToast);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleUngroup = () => {
    if (!combinedData?.groupId) return;
    deleteReportGroup(combinedData.groupId);
    onCombinedGroupChange?.(null);
    onBackToHome();
  };

  const handleViewFindingFromBodyMap = (findingId: string) => {
    const isNormal = normalFindings.some((f) => f.id === findingId);
    if (isNormal) {
      setShowMore(true);
      setOpenRow('normal_tests');
    }
    setFocusedFindingId(findingId);
    setTimeout(() => {
      const el = document.getElementById(`finding-${findingId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    setTimeout(() => {
      setFocusedFindingId((prev) => (prev === findingId ? null : prev));
    }, 2800);
  };

  const handleToggleReadAloud = () => {
    if (isSpeaking) {
      speechService.stop();
      setIsSpeaking(false);
      return;
    }

    const statusText =
      activeViewReport.overall_severity === 'green'
        ? `${t.statusGreen}. ${displaySeverityReason}`
        : activeViewReport.overall_severity === 'yellow'
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
    setShowExportModal(true);
  };

  const handleShareReport = async () => {
    const abnormalLines = abnormalFindings
      .slice(0, 6)
      .map((f) => {
        const name = f.translations?.[currentLanguage]?.name || f.name;
        const src = f.source_label ? ` [${f.source_label}]` : '';
        return `- ${name}: ${f.value} ${f.unit || ''} (${f.status.toUpperCase()})${src}`;
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

  const defaultPrintPayload = useMemo(
    () =>
      buildFullPdfPayload(activeViewReport, isCombinedMode && selectedScanIndex === 'all' ? combinedData : null, {
        language: currentLanguage,
        includeEnglishBilingual: false,
        includePatientIdentity: false,
        includeAllSavedMedicines: true,
      }),
    [activeViewReport, isCombinedMode, selectedScanIndex, combinedData, currentLanguage]
  );

  const effectivePrintPayload = customPrintPayload || defaultPrintPayload;

  return (
    <>
      <div className="min-h-screen bg-[var(--color-bg)] pb-16 pt-4 px-4 max-w-xl mx-auto print:hidden space-y-5">
        {/* Top Bar: Back + Add Pages (single report) + Translate */}
        <div className="flex items-center justify-between gap-2 print:hidden">
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

        <div className="flex items-center gap-2">
          {!isCombinedMode && onAddMorePages && (
            <button
              type="button"
              onClick={onAddMorePages}
              className="rs-card inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-bold text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] transition"
            >
              <FilePlus2 className="w-4 h-4 shrink-0" />
              <span>{ui.addMorePages}</span>
            </button>
          )}

          <button
            type="button"
            disabled={isTranslating}
            onClick={handleNextLanguage}
            className="rs-card inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] transition"
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
      </div>

      {/* Per-page Failed Append Retry Banners (preserves already succeeded pages!) */}
      {failedAppendPages.length > 0 && (
        <div className="space-y-2 print:hidden">
          {failedAppendPages.map((fp) => (
            <div
              key={fp.id}
              className="rounded-[16px] bg-[var(--color-caution-soft)] p-4 shadow-[var(--shadow-card)] flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertTriangle className="w-5 h-5 text-[var(--color-caution)] shrink-0" />
                <p className="text-sm font-extrabold text-[var(--color-text)]">
                  Page {fp.pageNumber} failed. Retry only this page.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onRetryFailedPage && (
                  <button
                    type="button"
                    onClick={() => onRetryFailedPage(fp)}
                    className="rs-btn-primary px-3.5 py-2 text-xs font-extrabold inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                )}
                {onDismissFailedPage && (
                  <button
                    type="button"
                    onClick={() => onDismissFailedPage(fp.id)}
                    className="text-xs font-bold text-[var(--color-text-secondary)] px-2 py-1"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {saveToast && (
        <div className="rounded-[16px] bg-[var(--color-brand)] text-white px-4 py-3 text-base font-bold flex items-center justify-center gap-2 shadow-[var(--shadow-card)] print:hidden">
          <Check className="w-5 h-5" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Combined Scans Switcher Tabs (All Combined | Scan 1 | Scan 2 ...) */}
      {isCombinedMode && combinedData && (
        <div className="space-y-3 print:hidden">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedScanIndex('all')}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold transition ${
                selectedScanIndex === 'all'
                  ? 'bg-[var(--color-brand)] text-white shadow-[var(--shadow-card)]'
                  : 'rs-card text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>{ui.allCombined}</span>
            </button>

            {combinedData.scans.map((scan, idx) => (
              <button
                key={scan.report.id}
                type="button"
                onClick={() => setSelectedScanIndex(idx)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                  selectedScanIndex === idx
                    ? 'bg-[var(--color-brand)] text-white shadow-[var(--shadow-card)]'
                    : 'rs-card text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]'
                }`}
              >
                {scan.label}
                {scan.dateLabel ? ` • ${scan.dateLabel}` : ''}
              </button>
            ))}
          </div>

          {/* Mismatch warning (different people / dates across scans) */}
          {selectedScanIndex === 'all' && combinedData.mismatchWarning && (
            <div className="rounded-[16px] bg-[var(--color-caution-soft)] p-4 flex items-start gap-3 shadow-[var(--shadow-card)]">
              <AlertTriangle className="w-5 h-5 text-[var(--color-caution)] shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-[var(--color-text)] leading-snug">
                {ui.mismatchText}
              </p>
            </div>
          )}

          {/* Report Group Save / Rename / Ungroup Bar */}
          {selectedScanIndex === 'all' && (
            <div className="rs-card p-3.5 space-y-2.5">
              {!combinedData.groupId && !showSaveGroupInput && (
                <button
                  type="button"
                  onClick={() => setShowSaveGroupInput(true)}
                  className="w-full flex items-center justify-center gap-2 text-sm font-extrabold text-[var(--color-brand)] py-1"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>{ui.saveAsGroup}</span>
                </button>
              )}

              {(showSaveGroupInput || isRenamingGroup) && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={groupNameInput}
                    onChange={(e) => setGroupNameInput(e.target.value)}
                    placeholder={ui.groupPlaceholder}
                    className="flex-1 rounded-[12px] border border-[var(--color-divider)] px-3 py-2 text-sm font-bold text-[var(--color-text)] bg-white"
                  />
                  <button
                    type="button"
                    onClick={isRenamingGroup ? handleCommitGroupRename : handleConfirmSaveGroup}
                    className="rs-btn-primary px-4 py-2 text-sm font-extrabold"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSaveGroupInput(false);
                      setIsRenamingGroup(false);
                    }}
                    className="px-2.5 py-2 text-sm font-bold text-[var(--color-text-secondary)]"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {combinedData.groupId && !isRenamingGroup && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold text-[var(--color-text)] truncate">
                    {combinedData.groupName}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setGroupNameInput(combinedData.groupName || '');
                        setIsRenamingGroup(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-[10px] bg-[var(--color-bg)] px-2.5 py-1.5 text-xs font-bold text-[var(--color-text)]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Rename</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleUngroup}
                      className="inline-flex items-center gap-1 rounded-[10px] bg-[var(--color-bg)] px-2.5 py-1.5 text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]"
                    >
                      <FolderMinus className="w-3.5 h-3.5" />
                      <span>Ungroup</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Report Title + DEMO / Page Count Pill */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {activeViewReport.isDemo && (
              <span className="rounded-full bg-[var(--color-brand)] text-white px-2.5 py-0.5 text-xs font-extrabold">
                DEMO
              </span>
            )}
            {activeViewReport.pages_count && activeViewReport.pages_count > 1 && (
              <span className="rounded-full bg-[var(--color-surface)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-text-secondary)] shadow-[var(--shadow-card)]">
                {activeViewReport.pages_count} pages
              </span>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--color-text)] leading-tight">
            {displayReportType}
          </h1>
        </div>
      </div>

      {/* 1. BIG TRAFFIC LIGHT + ONE LINE WHY */}
      <div
        className={`rs-card p-5 flex items-center gap-4 ${
          activeViewReport.overall_severity === 'green'
            ? 'bg-[var(--color-normal-soft)]'
            : activeViewReport.overall_severity === 'yellow'
            ? 'bg-[var(--color-caution-soft)]'
            : 'bg-[var(--color-danger-soft)]'
        }`}
      >
        <div className="flex flex-col items-center justify-between bg-[var(--color-surface)] p-2 rounded-[14px] shadow-[var(--shadow-card)] gap-2 shrink-0">
          <div
            className={`w-5 h-5 rounded-full ${
              activeViewReport.overall_severity === 'red'
                ? 'bg-[var(--color-danger)]'
                : 'bg-[var(--color-danger)]/20'
            }`}
          />
          <div
            className={`w-5 h-5 rounded-full ${
              activeViewReport.overall_severity === 'yellow'
                ? 'bg-[var(--color-caution)]'
                : 'bg-[var(--color-caution)]/20'
            }`}
          />
          <div
            className={`w-5 h-5 rounded-full ${
              activeViewReport.overall_severity === 'green'
                ? 'bg-[var(--color-normal)]'
                : 'bg-[var(--color-normal)]/20'
            }`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            {activeViewReport.overall_severity === 'green' ? (
              <CheckCircle2 className="w-6 h-6 text-[var(--color-normal)] shrink-0" />
            ) : activeViewReport.overall_severity === 'yellow' ? (
              <AlertTriangle className="w-6 h-6 text-[var(--color-caution)] shrink-0" />
            ) : (
              <AlertOctagon className="w-6 h-6 text-[var(--color-danger)] shrink-0" />
            )}
            <h2 className="text-xl font-extrabold text-[var(--color-text)] leading-none">
              {activeViewReport.overall_severity === 'green'
                ? t.statusGreen
                : activeViewReport.overall_severity === 'yellow'
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
      {activeViewReport.overall_severity === 'red' && (
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

      {/* 3. BETTER BODY VISUALIZATION (Deterministic table + tap interaction) */}
      <BodyMap
        affectedRegions={activeViewReport.body_regions_affected}
        findings={activeViewReport.findings}
        overallSeverity={activeViewReport.overall_severity}
        reportType={activeViewReport.report_type}
        language={currentLanguage}
        onViewFinding={handleViewFindingFromBodyMap}
      />

      {/* 4. ABNORMAL FINDINGS (Mapped first, then unmapped under "Other findings") */}
      {mappedAbnormalFindings.length > 0 && (
        <div className="space-y-3">
          {mappedAbnormalFindings.map((finding) => (
            <FindingGauge
              key={finding.id}
              finding={finding}
              language={currentLanguage}
              isFocused={focusedFindingId === finding.id}
            />
          ))}
        </div>
      )}

      {unmappedAbnormalFindings.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-sm font-extrabold text-[var(--color-text-secondary)] px-1">
            {ui.otherFindings}
          </h3>
          {unmappedAbnormalFindings.map((finding) => (
            <FindingGauge
              key={finding.id}
              finding={finding}
              language={currentLanguage}
              isFocused={focusedFindingId === finding.id}
            />
          ))}
        </div>
      )}

      {/* TWO ROUND BUTTONS (Read aloud & Save) + MORE DETAILS BUTTON */}
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
                isSaved || (isCombinedMode && Boolean(combinedData?.groupId))
                  ? 'bg-[var(--color-brand)] text-white'
                  : 'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]'
              }`}
            >
              {isSaved || (isCombinedMode && Boolean(combinedData?.groupId)) ? (
                <Check className="w-7 h-7" />
              ) : (
                <Bookmark className="w-7 h-7" />
              )}
            </span>
            <span className="text-base font-bold text-[var(--color-text)]">
              {isCombinedMode && selectedScanIndex === 'all'
                ? combinedData?.groupId
                  ? 'Saved'
                  : 'Save group'
                : isSaved
                ? 'Saved'
                : 'Save'}
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

      {/* MORE DETAILS (Collapsed rows) */}
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
                    <FindingGauge
                      key={finding.id}
                      finding={finding}
                      language={currentLanguage}
                      isFocused={focusedFindingId === finding.id}
                    />
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
                        {f.translations?.[currentLanguage]?.name || f.name}
                        {f.source_label ? ` (${f.source_label})` : ''}:{' '}
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
                {activeViewReport.urgency === 'today'
                  ? t.urgencyToday
                  : activeViewReport.urgency === 'soon'
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

      {/* Permanent Footer */}
      <p className="text-center text-sm font-medium text-[var(--color-text-secondary)] pt-2">
        {t.permanentFooter}
      </p>
    </div>

    {/* Dedicated Full-Report A4 Print View (used by window.print() / Print button) */}
    <PrintReportSheet payload={effectivePrintPayload} />

    {/* Export / Print Modal (Language choice, bilingual toggle, name privacy toggle, Preview, Download PDF, Print, Share) */}
    {showExportModal && (
      <ReportExportModal
        report={activeViewReport}
        combinedData={isCombinedMode && selectedScanIndex === 'all' ? combinedData : null}
        initialLanguage={currentLanguage}
        onPrintPayloadReady={(p) => setCustomPrintPayload(p)}
        onClose={() => setShowExportModal(false)}
      />
    )}
    </>
  );
};
