import React, { useEffect, useMemo, useState } from 'react';
import { CombinedReportData, ReportAnalysis } from '../types/report';
import { SupportedLanguage } from '../utils/translations';
import {
  buildFullPdfPayload,
  getLinkedMedicinesCountForReport,
  PdfExportOptions,
  PdfReportPayload,
} from '../utils/pdfReportData';
import {
  X,
  Download,
  Printer,
  Share2,
  Loader2,
  FileText,
  Check,
  Languages,
  UserCheck,
  Pill,
} from 'lucide-react';

interface ReportExportModalProps {
  report: ReportAnalysis;
  combinedData: CombinedReportData | null;
  initialLanguage: SupportedLanguage;
  onPrintPayloadReady: (payload: PdfReportPayload) => void;
  onClose: () => void;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  report,
  combinedData,
  initialLanguage,
  onPrintPayloadReady,
  onClose,
}) => {
  const medCounts = useMemo(
    () => getLinkedMedicinesCountForReport(report, combinedData),
    [report, combinedData]
  );

  const [language, setLanguage] = useState<SupportedLanguage>(initialLanguage);
  const [includeEnglishBilingual, setIncludeEnglishBilingual] = useState<boolean>(
    initialLanguage !== 'en'
  );
  const [includePatientIdentity, setIncludePatientIdentity] = useState<boolean>(false);
  const [includeAllSavedMedicines, setIncludeAllSavedMedicines] = useState<boolean>(
    medCounts.linkedCount > 0
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const options: PdfExportOptions = useMemo(
    () => ({
      language,
      includeEnglishBilingual: language !== 'en' && includeEnglishBilingual,
      includePatientIdentity,
      includeAllSavedMedicines,
    }),
    [language, includeEnglishBilingual, includePatientIdentity, includeAllSavedMedicines]
  );

  const previewPayload = useMemo(
    () => buildFullPdfPayload(report, combinedData, options),
    [report, combinedData, options]
  );

  // Keep PrintReportSheet synced with selected options automatically
  useEffect(() => {
    onPrintPayloadReady(previewPayload);
  }, [previewPayload, onPrintPayloadReady]);

  const canShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleDownloadPdf = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    setIsGenerating(true);
    try {
      const { generateFullReportPdf } = await import('../utils/pdfGenerator');
      const { blob, filename } = await generateFullReportPdf(previewPayload);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setStatusMessage('PDF downloaded!');
    } catch (err) {
      console.error('PDF generation failed:', err);
      setErrorMessage('Could not create PDF. Try tapping Print -> Save as PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintNow = () => {
    onPrintPayloadReady(previewPayload);
    setTimeout(() => {
      window.print();
    }, 80);
  };

  const handleSharePdf = async () => {
    if (!canShare) return;
    setErrorMessage(null);
    setStatusMessage(null);
    setIsGenerating(true);
    try {
      const { generateFullReportPdf } = await import('../utils/pdfGenerator');
      const { blob, filename } = await generateFullReportPdf(previewPayload);
      const file = new File([blob], filename, { type: 'application/pdf' });
      const navWithCanShare = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };

      if (navWithCanShare.canShare && navWithCanShare.canShare({ files: [file] })) {
        await navigator.share({
          title: previewPayload.header.reportTitle,
          text: `${previewPayload.header.reportTitle} — ${previewPayload.overallStatus.statusDisplay}`,
          files: [file],
        });
      } else {
        await navigator.share({
          title: previewPayload.header.reportTitle,
          text: `${previewPayload.header.reportTitle}\n${previewPayload.overallStatus.statusDisplay}: ${previewPayload.overallStatus.reason}\n\n${previewPayload.footerText}`,
        });
      }
    } catch {
      // User dismissed share sheet
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--color-text)]/50 p-0 sm:p-4 print:hidden"
      onClick={onClose}
    >
      <div
        className="rs-card w-full sm:max-w-md rounded-b-none sm:rounded-[16px] p-5 sm:p-6 max-h-[90vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-divider)]">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[var(--color-brand)]" />
            <h3 className="text-xl font-extrabold text-[var(--color-text)]">
              Download / Print PDF
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center text-[var(--color-text-secondary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Picker */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--color-text-secondary)]">
            <Languages className="w-4 h-4 text-[var(--color-brand)]" />
            <span>PDF Language</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { code: 'en', label: 'English' },
                { code: 'hi', label: 'हिन्दी' },
                { code: 'or', label: 'ଓଡ଼ିଆ' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => setLanguage(opt.code)}
                className={`py-2.5 rounded-[12px] text-sm font-extrabold transition ${
                  language === opt.code
                    ? 'bg-[var(--color-brand)] text-white shadow-[var(--shadow-card)]'
                    : 'bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {language !== 'en' && (
            <label className="flex items-center gap-3 rounded-[12px] bg-[var(--color-bg)] px-3.5 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeEnglishBilingual}
                onChange={(e) => setIncludeEnglishBilingual(e.target.checked)}
                className="w-5 h-5 accent-[#0F766E] rounded"
              />
              <span className="text-sm font-bold text-[var(--color-text)]">
                Include English + {language === 'hi' ? 'Hindi' : 'Odia'} (for doctor)
              </span>
            </label>
          )}
        </div>

        {/* Privacy & Optional Toggles */}
        <div className="space-y-2">
          <label className="flex items-center gap-3 rounded-[12px] bg-[var(--color-bg)] px-3.5 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includePatientIdentity}
              onChange={(e) => setIncludePatientIdentity(e.target.checked)}
              className="w-5 h-5 accent-[#0F766E] rounded"
            />
            <UserCheck className="w-4 h-4 text-[var(--color-brand)] shrink-0" />
            <span className="text-sm font-bold text-[var(--color-text)]">
              Include my name / age & gender
            </span>
          </label>

          {medCounts.totalSavedCount > 0 && (
            <label className="flex items-center gap-3 rounded-[12px] bg-[var(--color-bg)] px-3.5 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAllSavedMedicines}
                onChange={(e) => setIncludeAllSavedMedicines(e.target.checked)}
                className="w-5 h-5 accent-[#0F766E] rounded"
              />
              <Pill className="w-4 h-4 text-[var(--color-brand)] shrink-0" />
              <span className="text-sm font-bold text-[var(--color-text)]">
                Include my saved medicines ({medCounts.totalSavedCount})
              </span>
            </label>
          )}
        </div>

        {/* Compact Full-Data Preview Card */}
        <div className="rounded-[14px] bg-[var(--color-brand-soft)]/50 p-4 space-y-1.5 text-sm">
          <p className="font-extrabold text-[var(--color-brand)]">
            Complete A4 Report Included:
          </p>
          <p className="font-semibold text-[var(--color-text)]">
            • {previewPayload.allFindingsCount} test results (normal & abnormal)
          </p>
          <p className="font-semibold text-[var(--color-text)]">
            • Front & Back body map ({previewPayload.bodyMap.legendRows.length} areas)
          </p>
          <p className="font-semibold text-[var(--color-text)]">
            • Care steps, symptoms, urgency & doctor questions
          </p>
          {previewPayload.medicines.length > 0 && (
            <p className="font-semibold text-[var(--color-text)]">
              • {previewPayload.medicines.length} medicine(s) & safety warnings
            </p>
          )}
          {previewPayload.trends.length > 0 && (
            <p className="font-semibold text-[var(--color-text)]">
              • {previewPayload.trends.length} trend chart(s)
            </p>
          )}
          {previewPayload.combinedScans.length > 0 && (
            <p className="font-semibold text-[var(--color-text)]">
              • {previewPayload.combinedScans.length} combined scans included
            </p>
          )}
        </div>

        {/* Generating / Success / Error states */}
        {isGenerating && (
          <div className="flex items-center justify-center gap-2.5 rounded-[12px] bg-[var(--color-bg)] py-3 text-base font-bold text-[var(--color-brand)]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating PDF...</span>
          </div>
        )}

        {statusMessage && (
          <div className="flex items-center justify-center gap-2 rounded-[12px] bg-[var(--color-normal-soft)] py-2.5 text-sm font-extrabold text-[var(--color-normal)]">
            <Check className="w-4 h-4" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <p className="text-sm font-bold text-[var(--color-danger)] text-center">
            {errorMessage}
          </p>
        )}

        {/* Action Buttons: Download PDF + Print + Share */}
        <div className="space-y-2.5 pt-1">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleDownloadPdf}
              className="rs-btn-primary py-3.5 px-4 flex items-center justify-center gap-2 text-base font-extrabold disabled:opacity-60"
            >
              <Download className="w-5 h-5 shrink-0" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={handlePrintNow}
              className="rounded-[16px] bg-[var(--color-surface-subtle)] hover:bg-[var(--color-divider)] text-[var(--color-text)] py-3.5 px-4 flex items-center justify-center gap-2 text-base font-extrabold transition"
            >
              <Printer className="w-5 h-5 shrink-0 text-[var(--color-brand)]" />
              <span>Print</span>
            </button>
          </div>

          {canShare && (
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleSharePdf}
              className="w-full rounded-[14px] border border-[var(--color-divider)] bg-[var(--color-surface)] hover:bg-[var(--color-bg)] text-[var(--color-text)] py-3 px-4 flex items-center justify-center gap-2 text-base font-bold transition disabled:opacity-60"
            >
              <Share2 className="w-4 h-4 text-[var(--color-brand)]" />
              <span>Share PDF</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
