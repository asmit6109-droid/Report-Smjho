import React, { useState, useEffect } from 'react';
import { ReportAnalysis, MarkerTrend } from '../types/report';
import { SupportedLanguage, translations } from '../utils/translations';
import {
  getStoredReports,
  calculateMarkerTrends,
  deleteReportFromStorage,
  clearAllLocalData,
} from '../utils/storage';
import {
  ArrowLeft,
  Calendar,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface PastReportsProps {
  language: SupportedLanguage;
  onSelectReport: (report: ReportAnalysis) => void;
  onBackToHome: () => void;
  onDataReset: () => void;
}

export const PastReports: React.FC<PastReportsProps> = ({
  language,
  onSelectReport,
  onBackToHome,
  onDataReset,
}) => {
  const [reports, setReports] = useState<ReportAnalysis[]>([]);
  const [trends, setTrends] = useState<MarkerTrend[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const t = translations[language];

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = () => {
    const list = getStoredReports();
    setReports(list);
    setTrends(calculateMarkerTrends(list));
  };

  const handleDeleteOne = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteReportFromStorage(id);
    loadReports();
  };

  const handleConfirmClearAll = () => {
    clearAllLocalData();
    setShowDeleteConfirm(false);
    onDataReset();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-4 px-4 max-w-xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 shadow-xs hover:bg-slate-100 transition active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.backToHome}</span>
        </button>

        <h2 className="text-base font-bold text-slate-900">{t.pastReportsBtn}</h2>

        <div className="w-12" />
      </div>

      {/* Privacy Guarantee Note */}
      <div className="mb-4 rounded-2xl bg-teal-50 border border-teal-200 p-3 text-xs text-teal-900 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
        <span className="font-medium leading-relaxed">{t.privacyNote}</span>
      </div>

      {/* Repeating Marker Trends Section */}
      {trends.length > 0 && (
        <div className="mb-6 rounded-3xl bg-white p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">{t.trendTitle}</h3>
          </div>

          <div className="space-y-3">
            {trends.map((tr, idx) => {
              const minVal = Math.min(...tr.history.map((h) => h.value));
              const maxVal = Math.max(...tr.history.map((h) => h.value));
              const range = maxVal - minVal || 1;

              // Compute simple SVG polyline coords
              const svgPoints = tr.history
                .map((pt, i) => {
                  const x = 10 + (i / (tr.history.length - 1 || 1)) * 140;
                  const y = 35 - ((pt.value - minVal) / range) * 25;
                  return `${x},${y}`;
                })
                .join(' ');

              return (
                <div key={idx} className="rounded-2xl bg-slate-50 p-3 border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{tr.markerName}</h4>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {tr.changeSummary}
                      </p>
                    </div>

                    {/* Trend Badge */}
                    <div
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                        tr.direction === 'better'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : tr.direction === 'worse'
                          ? 'bg-rose-100 text-rose-900 border border-rose-300'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {tr.direction === 'better' ? (
                        <>
                          <TrendingDown className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{t.trendBetter}</span>
                        </>
                      ) : tr.direction === 'worse' ? (
                        <>
                          <TrendingUp className="w-3.5 h-3.5 text-rose-700" />
                          <span>{t.trendWorse}</span>
                        </>
                      ) : (
                        <>
                          <Minus className="w-3.5 h-3.5 text-slate-600" />
                          <span>{t.trendSame}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Sparkline SVG Chart */}
                  <div className="mt-2 flex items-center justify-between">
                    <svg viewBox="0 0 160 40" className="w-36 h-9 overflow-visible">
                      <polyline
                        fill="none"
                        stroke="#0d9488"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={svgPoints}
                      />
                      {tr.history.map((pt, ptIdx) => {
                        const cx = 10 + (ptIdx / (tr.history.length - 1 || 1)) * 140;
                        const cy = 35 - ((pt.value - minVal) / range) * 25;
                        return (
                          <circle
                            key={ptIdx}
                            cx={cx}
                            cy={cy}
                            r="3.5"
                            fill="#0d9488"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                        );
                      })}
                    </svg>

                    <div className="text-[10px] text-slate-400 font-medium text-right">
                      {tr.history.length} tests tracked
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 border border-slate-200 text-center my-6">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            {t.noPastReports}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 px-1">
            Saved Reports ({reports.length})
          </h3>

          {reports.map((rep) => {
            return (
              <div
                key={rep.id}
                onClick={() => onSelectReport(rep)}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-teal-400 cursor-pointer transition active:scale-98 flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  {/* Status Indicator */}
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      rep.overall_severity === 'green'
                        ? 'bg-emerald-100 text-emerald-700'
                        : rep.overall_severity === 'yellow'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {rep.overall_severity === 'green' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : rep.overall_severity === 'yellow' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <AlertOctagon className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-teal-800 transition">
                      {rep.report_type}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>{new Date(rep.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{rep.findings.length} findings</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleDeleteOne(e, rep.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Delete report"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-teal-600 transition" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete All Data Button */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-rose-300 bg-rose-50/60 py-3 text-xs font-bold text-rose-700 hover:bg-rose-100 transition active:scale-98"
        >
          <Trash2 className="w-4 h-4 text-rose-600" />
          <span>{t.deleteDataBtn}</span>
        </button>
      </div>

      {/* Delete All Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="h-12 w-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">
              {t.deleteDataBtn}
            </h3>
            <p className="mt-2 text-xs text-slate-600 text-center leading-relaxed font-medium">
              {t.deleteDataConfirm}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-2xl border border-slate-200 bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="rounded-2xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
