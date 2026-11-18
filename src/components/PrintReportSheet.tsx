import React from 'react';
import { BodyRegionId } from '../types/report';
import { SYSTEMIC_REGION_IDS } from '../utils/bodyMapper';
import { PdfReportPayload } from '../utils/pdfReportData';
import { CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

interface PrintReportSheetProps {
  payload: PdfReportPayload;
}

const PRINT_SEV_COLOR: Record<'normal' | 'caution' | 'danger', string> = {
  normal: '#16A34A',
  caution: '#B45309',
  danger: '#DC2626',
};

const PrintBodySvg: React.FC<{
  view: 'front' | 'back';
  regionIndexMap: Map<BodyRegionId, { index: number; sev: 'normal' | 'caution' | 'danger' }>;
}> = ({ view, regionIndexMap }) => {
  const renderZone = (rId: BodyRegionId, pts: [number, number, number][]) => {
    const info = regionIndexMap.get(rId);
    if (!info) return null;
    const strokeCol = PRINT_SEV_COLOR[info.sev];
    return (
      <g key={rId}>
        {pts.map(([cx, cy, r], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r + 4} fill={strokeCol} fillOpacity={0.18} stroke={strokeCol} strokeWidth={1.5} />
            <circle cx={cx} cy={cy} r={r} fill={strokeCol} fillOpacity={0.9} />
            {i === 0 && (
              <text
                x={cx}
                y={cy + 3.5}
                textAnchor="middle"
                fontSize="10"
                fontWeight="bold"
                fill="#FFFFFF"
              >
                {info.index}
              </text>
            )}
          </g>
        ))}
      </g>
    );
  };

  return (
    <svg viewBox="0 0 240 385" className="w-32 h-52">
      <g fill="#F3F4F6" stroke="#CBD5E1" strokeWidth="2.2" strokeLinejoin="round">
        <circle cx="120" cy="40" r="23" />
        <path d="M 111 62 L 111 80 L 129 80 L 129 62 Z" />
        <path d="M 84 80 L 156 80 L 148 175 L 92 175 Z" />
        <path d="M 92 175 L 148 175 L 142 210 L 98 210 Z" />
        <path d="M 84 83 L 60 152 L 50 220 L 63 222 L 73 156 L 90 92 Z" />
        <path d="M 156 83 L 180 152 L 190 220 L 177 222 L 167 156 L 150 92 Z" />
        <path d="M 98 210 L 92 288 L 88 355 L 108 355 L 114 288 L 117 210 Z" />
        <ellipse cx="97" cy="364" rx="13" ry="7" />
        <path d="M 123 210 L 126 288 L 132 355 L 152 355 L 148 288 L 142 210 Z" />
        <ellipse cx="143" cy="364" rx="13" ry="7" />
      </g>
      {view === 'back' && (
        <line x1="120" y1="64" x2="120" y2="188" stroke="#CBD5E1" strokeWidth="3" strokeDasharray="3 3" />
      )}
      {view === 'front' ? (
        <>
          {renderZone('head', [[120, 36, 15]])}
          {renderZone('eyes_ears', [
            [111, 40, 5.5],
            [129, 40, 5.5],
          ])}
          {renderZone('thyroid', [[120, 70, 9.5]])}
          {renderZone('chest_lungs', [
            [105, 107, 11],
            [135, 107, 11],
          ])}
          {renderZone('heart', [[127, 109, 10.5]])}
          {renderZone('abdomen_liver', [[107, 139, 12]])}
          {renderZone('stomach_intestines', [[130, 150, 12]])}
          {renderZone('urinary_system', [[120, 182, 9.5]])}
          {renderZone('pelvis', [[120, 194, 13]])}
          {renderZone('shoulder_left', [[82, 87, 9.5]])}
          {renderZone('shoulder_right', [[158, 87, 9.5]])}
          {renderZone('arms_hands', [
            [63, 178, 9],
            [177, 178, 9],
          ])}
          {renderZone('knee_left', [[106, 282, 10.5]])}
          {renderZone('knee_right', [[134, 282, 10.5]])}
          {renderZone('feet', [
            [103, 362, 9.5],
            [137, 362, 9.5],
          ])}
        </>
      ) : (
        <>
          {renderZone('head', [[120, 40, 15]])}
          {renderZone('neck_cervical', [[120, 75, 10]])}
          {renderZone('spine_thoracic', [[120, 114, 11]])}
          {renderZone('spine_lumbar', [[120, 156, 11]])}
          {renderZone('kidney', [
            [100, 146, 9],
            [140, 146, 9],
          ])}
          {renderZone('pelvis', [[120, 192, 12]])}
          {renderZone('shoulder_left', [[82, 87, 9.5]])}
          {renderZone('shoulder_right', [[158, 87, 9.5]])}
          {renderZone('arms_hands', [
            [63, 178, 9],
            [177, 178, 9],
          ])}
          {renderZone('knee_left', [[106, 282, 10.5]])}
          {renderZone('knee_right', [[134, 282, 10.5]])}
          {renderZone('feet', [
            [103, 362, 9.5],
            [137, 362, 9.5],
          ])}
        </>
      )}
    </svg>
  );
};

export const PrintReportSheet: React.FC<PrintReportSheetProps> = ({ payload }) => {
  const { labels, header, overallStatus, bodyMap } = payload;

  const regionIndexMap = new Map<
    BodyRegionId,
    { index: number; sev: 'normal' | 'caution' | 'danger' }
  >();
  bodyMap.legendRows.forEach((lr, idx) => {
    regionIndexMap.set(lr.regionId, { index: idx + 1, sev: lr.severity });
  });

  return (
    <div className="hidden rs-print-only bg-white text-black pb-12 space-y-5">
      {/* 1. HEADER */}
      <div className="rs-print-avoid-break rounded-lg bg-[#E6F3F2] p-3.5 border border-[#0F766E]/25">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[#0F766E]">{header.appName}</p>
            <h1 className="text-xl font-extrabold text-black leading-tight mt-0.5">
              {header.reportTitle}
            </h1>
            {header.patientLine && (
              <p className="text-sm font-bold text-black mt-1">
                Patient: {header.patientLine}
              </p>
            )}
          </div>
          <div className="text-right text-xs text-gray-700 shrink-0">
            <p>
              <strong>Report Date:</strong> {header.reportDate}
            </p>
            <p>
              <strong>Generated:</strong> {header.generatedAt}
            </p>
          </div>
        </div>
      </div>

      {/* 2. EMERGENCY BANNER + OVERALL STATUS */}
      {overallStatus.hasEmergency && (
        <div className="rs-print-avoid-break rounded-lg border-2 border-[#DC2626] bg-[#FEF2F2] p-3 flex items-center gap-3">
          <AlertOctagon className="w-6 h-6 text-[#DC2626] shrink-0" />
          <p className="text-sm font-extrabold text-[#991B1B]">
            {overallStatus.emergencyBannerText}
          </p>
        </div>
      )}

      <div
        className="rs-print-avoid-break rounded-lg border p-3.5 flex items-start gap-3"
        style={{
          backgroundColor:
            overallStatus.severity === 'green'
              ? '#F0FDF4'
              : overallStatus.severity === 'yellow'
              ? '#FFFBEB'
              : '#FEF2F2',
          borderColor:
            overallStatus.severity === 'green'
              ? '#16A34A'
              : overallStatus.severity === 'yellow'
              ? '#B45309'
              : '#DC2626',
        }}
      >
        {overallStatus.severity === 'green' ? (
          <CheckCircle2 className="w-6 h-6 text-[#16A34A] shrink-0 mt-0.5" />
        ) : overallStatus.severity === 'yellow' ? (
          <AlertTriangle className="w-6 h-6 text-[#B45309] shrink-0 mt-0.5" />
        ) : (
          <AlertOctagon className="w-6 h-6 text-[#DC2626] shrink-0 mt-0.5" />
        )}
        <div>
          <h2 className="text-base font-extrabold text-black">{overallStatus.statusDisplay}</h2>
          <p className="text-sm text-black mt-0.5">{overallStatus.reason}</p>
        </div>
      </div>

      {/* 3. VECTOR BODY MAP + LEGEND */}
      <div className="rs-print-avoid-break space-y-2">
        <h3 className="text-sm font-extrabold text-[#0F766E] border-b border-[#0F766E] pb-1">
          {labels.sectionBodyMap}
        </h3>
        <div className="rounded-lg border border-gray-300 p-3 flex items-start gap-4">
          <div className="flex items-start gap-3 shrink-0">
            <div className="text-center">
              <p className="text-xs font-bold text-gray-700 mb-1">{labels.frontView}</p>
              <PrintBodySvg view="front" regionIndexMap={regionIndexMap} />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-gray-700 mb-1">{labels.backView}</p>
              <PrintBodySvg view="back" regionIndexMap={regionIndexMap} />
            </div>
          </div>

          <div className="flex-1 space-y-2 pt-2">
            {bodyMap.legendRows.length === 0 ? (
              <p className="text-xs text-gray-600">
                No specific body area highlighted for this report.
              </p>
            ) : (
              bodyMap.legendRows.map((row, idx) => (
                <div key={row.regionId} className="flex items-start gap-2 text-xs">
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white font-bold shrink-0"
                    style={{ backgroundColor: PRINT_SEV_COLOR[row.severity] }}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-bold text-black">
                      {row.areaLabel}
                      {SYSTEMIC_REGION_IDS.has(row.regionId) ? ' [General]' : ''}
                    </p>
                    <p className="text-gray-700">
                      {row.kindLabel} — <strong>{row.statusText}</strong>
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. ALL TEST RESULTS TABLE (Normal + Abnormal, repeating thead) */}
      <div className="space-y-2">
        <h3 className="text-sm font-extrabold text-[#0F766E] border-b border-[#0F766E] pb-1">
          {labels.sectionAllTests} ({payload.allFindingsCount})
        </h3>
        <table className="rs-print-table text-xs border border-gray-300">
          <thead>
            <tr className="bg-[#0F766E] text-white text-left">
              <th className="p-2 border border-gray-300">{labels.colTest}</th>
              <th className="p-2 border border-gray-300">{labels.colValue}</th>
              <th className="p-2 border border-gray-300">{labels.colRange}</th>
              <th className="p-2 border border-gray-300">{labels.colStatus}</th>
              <th className="p-2 border border-gray-300">{labels.colSource}</th>
              <th className="p-2 border border-gray-300">{labels.colArea}</th>
              {header.isCombined && (
                <th className="p-2 border border-gray-300">{labels.colScan}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {payload.findingCategories.map((cat) => (
              <React.Fragment key={cat.categoryName}>
                <tr className="bg-[#E6F3F2]">
                  <td
                    colSpan={header.isCombined ? 7 : 6}
                    className="p-1.5 font-extrabold text-[#0F766E] border border-gray-300"
                  >
                    {cat.categoryName}
                  </td>
                </tr>
                {cat.rows.map((row) => (
                  <tr
                    key={row.id}
                    style={{
                      backgroundColor:
                        row.status === 'critical'
                          ? '#FEF2F2'
                          : row.status === 'high' || row.status === 'low'
                          ? '#FFFBEB'
                          : '#FFFFFF',
                    }}
                  >
                    <td className="p-2 font-bold border border-gray-300">{row.testName}</td>
                    <td className="p-2 font-bold border border-gray-300">
                      {row.value} {row.unit !== '—' ? row.unit : ''}
                    </td>
                    <td className="p-2 text-gray-700 border border-gray-300">{row.normalRange}</td>
                    <td className="p-2 font-bold border border-gray-300">{row.statusText}</td>
                    <td className="p-2 text-gray-700 border border-gray-300">
                      {row.rangeSourceText}
                    </td>
                    <td className="p-2 border border-gray-300">{row.relatedAreaText}</td>
                    {header.isCombined && (
                      <td className="p-2 font-bold text-[#0F766E] border border-gray-300">
                        {row.scanLabel || '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* 5. ABNORMAL EXPLANATIONS */}
      {payload.abnormalExplanations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-extrabold text-[#0F766E] border-b border-[#0F766E] pb-1">
            {labels.sectionExplanations}
          </h3>
          <div className="space-y-2">
            {payload.abnormalExplanations.map((item) => (
              <div
                key={item.id}
                className="rs-print-avoid-break rounded border border-gray-300 p-2.5 text-xs"
                style={{
                  backgroundColor: item.status === 'critical' ? '#FEF2F2' : '#FFFBEB',
                }}
              >
                <p className="font-bold text-black">
                  {item.testName}: {item.valueText} {item.statusText}
                  {item.scanLabel ? ` (${item.scanLabel})` : ''}
                </p>
                <p className="text-black mt-0.5">{item.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. SYMPTOMS */}
      {payload.symptoms.length > 0 && (
        <div className="rs-print-avoid-break space-y-1.5">
          <h3 className="text-sm font-extrabold text-[#0F766E] border-b border-[#0F766E] pb-1">
            {labels.sectionSymptoms}
          </h3>
          <ul className="list-disc pl-5 text-xs space-y-1">
            {payload.symptoms.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 7. URGENCY */}
      <div className="rs-print-avoid-break space-y-1.5">
        <h3 className="text-sm font-extrabold text-[#0F766E] border-b border-[#0F766E] pb-1">
          {labels.sectionUrgency}
        </h3>
        <p className="text-xs font-bold p-2.5 rounded border border-gray-300 bg-gray-50">
          {payload.urgency.label}
        </p>
      </div>

      {/* 8. SAFE CARE STEPS */}
      {payload.safeSteps.length > 0 && (
        <div className="rs-print-avoid-break space-y-1.5">
          <h3 className="text-sm font-extrabold text-[#0F766E] border-b border-[#0F766E] pb-1">
            {labels.sectionSafeSteps}
          </h3>
          <ul className="list-disc pl-5 text-xs space-y-1">
            {payload.safeSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 9. QUESTIONS FOR DOCTOR */}
      {payload.doctorQuestions.length > 0 && (
        <div className="rs-print-avoid-break space-y-1.5">
          <h3 className="text-sm font-extrabold text-[#0F766E] border-b border-[#0F766E] pb-1">
            {labels.sectionQuestions}
          </h3>
          <ol className="list-decimal pl-5 text-xs space-y-1">
            {payload.doctorQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </div>
      )}

      {/* 10. MEDICINES */}
      {payload.medicines.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-extrabold text-[#0F766E] border-b border-[#0F766E] pb-1">
            {labels.sectionMedicines}
          </h3>
          {payload.medicines.map((med) => (
            <div
              key={med.id}
              className="rs-print-avoid-break rounded border border-gray-300 p-3 text-xs space-y-1"
            >
              <p className="text-sm font-extrabold text-black">
                {med.brand} ({med.strength})
              </p>
              <p>
                <strong>{labels.medSalt}:</strong> {med.salt}
              </p>
              <p>
                <strong>{labels.medWhoCanGive}:</strong> {med.whoCanGive}
              </p>
              <p>
                <strong>{labels.medUsedFor}:</strong> {med.usedFor}
              </p>
              {med.commonSideEffects.length > 0 && (
                <p>
                  <strong>{labels.medSideEffectsCommon}:</strong>{' '}
                  {med.commonSideEffects.join(', ')}
                </p>
              )}
              {med.seeDoctorSideEffects.length > 0 && (
                <p className="text-[#991B1B]">
                  <strong>{labels.medSideEffectsDoctor}:</strong>{' '}
                  {med.seeDoctorSideEffects.join(', ')}
                </p>
              )}
              {med.warnings.length > 0 && (
                <p className="text-[#991B1B] font-bold">
                  <strong>{labels.medWarnings}:</strong> {med.warnings.join(' | ')}
                </p>
              )}
              {med.whyGiven && (
                <p>
                  <strong>{labels.medWhyGiven}:</strong> {med.whyGiven}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 11. COMBINED SCANS */}
      {payload.combinedScans.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-extrabold text-[#0F766E] border-b border-[#0F766E] pb-1">
            {labels.sectionCombined}
          </h3>
          {payload.combinedMismatchWarning && (
            <p className="text-xs font-bold text-[#92400E] bg-[#FFFBEB] border border-[#F59E0B] rounded p-2">
              {payload.combinedMismatchWarning}
            </p>
          )}
          {payload.combinedScans.map((scan) => (
            <div
              key={scan.scanLabel}
              className="rs-print-avoid-break rounded border border-gray-300 bg-gray-50 p-2 text-xs"
            >
              <p className="font-bold">
                {scan.scanLabel} ({scan.dateLabel}): {scan.reportType} — [{scan.statusLabel}]
              </p>
              <p>{scan.reason}</p>
            </div>
          ))}
        </div>
      )}

      {/* 12. VECTOR TREND CHARTS */}
      {payload.trends.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-extrabold text-[#0F766E] border-b border-[#0F766E] pb-1">
            {labels.sectionTrends}
          </h3>
          <div className="space-y-2">
            {payload.trends.map((tr, idx) => {
              const vals = tr.history.map((h) => h.value);
              const minV = Math.min(...vals);
              const maxV = Math.max(...vals);
              const span = maxV - minV || 1;
              const pts = tr.history.map((pt, i) => ({
                x: 25 + (i / Math.max(1, tr.history.length - 1)) * 310,
                y: 45 - ((pt.value - minV) / span) * 28,
                val: pt.value,
                date: new Date(pt.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                }),
              }));
              return (
                <div
                  key={idx}
                  className="rs-print-avoid-break rounded border border-gray-300 p-2.5 text-xs"
                >
                  <p className="font-bold mb-1">
                    {tr.markerName} ({tr.changeSummary})
                  </p>
                  <svg viewBox="0 0 360 66" className="w-full h-16">
                    <line x1="20" y1="50" x2="340" y2="50" stroke="#D1D5DB" strokeWidth="1" />
                    <polyline
                      fill="none"
                      stroke="#0F766E"
                      strokeWidth="2"
                      points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
                    />
                    {pts.map((p, pIdx) => (
                      <g key={pIdx}>
                        <circle cx={p.x} cy={p.y} r="3.5" fill="#0F766E" />
                        <text
                          x={p.x}
                          y={p.y - 6}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="bold"
                          fill="#111827"
                        >
                          {p.val}
                        </text>
                        <text
                          x={p.x}
                          y={62}
                          textAnchor="middle"
                          fontSize="8"
                          fill="#4B5563"
                        >
                          {p.date}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 13. RUNNING PRINT FOOTER */}
      <div className="rs-print-footer">{payload.footerText}</div>
    </div>
  );
};
