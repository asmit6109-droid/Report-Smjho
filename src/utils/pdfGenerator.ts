import { jsPDF } from 'jspdf';
import autoTable, { CellHookData, RowInput } from 'jspdf-autotable';
import { BodyRegionId } from '../types/report';
import { SYSTEMIC_REGION_IDS } from './bodyMapper';
import {
  drawMixedScriptLines,
  drawSingleLineMixedText,
  PdfFontStyle,
  registerPdfUnicodeFonts,
  ScriptRun,
  wrapMixedScriptLines,
} from './pdfFonts';
import { PdfReportPayload } from './pdfReportData';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 12;
const CONTENT_W = PAGE_W - MARGIN_X * 2; // 186mm
const MAX_Y = 276;

const TEAL: [number, number, number] = [15, 118, 110];
const TEXT_BLACK: [number, number, number] = [17, 24, 39];
const TEXT_MUTED: [number, number, number] = [75, 85, 99];
const LINE_GRAY: [number, number, number] = [209, 213, 219];
const CARD_BORDER: [number, number, number] = [226, 232, 240];

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function getSeverityColor(sev: 'normal' | 'caution' | 'danger' | 'green' | 'yellow' | 'red'): {
  accent: [number, number, number];
  tint: [number, number, number];
} {
  if (sev === 'danger' || sev === 'red') {
    return { accent: [220, 38, 38], tint: [254, 242, 242] };
  }
  if (sev === 'caution' || sev === 'yellow') {
    return { accent: [180, 110, 0], tint: [255, 251, 235] };
  }
  return { accent: [22, 163, 74], tint: [240, 253, 244] };
}

function collectPayloadTextCorpus(payload: PdfReportPayload): string {
  const parts: string[] = [
    payload.header.reportTitle,
    payload.overallStatus.statusDisplay,
    payload.overallStatus.reason,
    payload.overallStatus.emergencyBannerText,
    payload.urgency.label,
    payload.footerText,
    ...Object.values(payload.labels),
    ...payload.symptoms,
    ...payload.safeSteps,
    ...payload.doctorQuestions,
    ...payload.bodyMap.legendRows.flatMap((r) => [r.areaLabel, r.kindLabel]),
    ...payload.abnormalExplanations.flatMap((e) => [e.testName, e.explanation]),
    ...payload.findingCategories.flatMap((g) => [
      g.categoryName,
      ...g.rows.flatMap((r) => [r.testName, r.statusText, r.rangeSourceText, r.relatedAreaText]),
    ]),
    ...payload.medicines.flatMap((m) => [
      m.brand,
      m.salt,
      m.whoCanGive,
      m.usedFor,
      ...m.commonSideEffects,
      ...m.seeDoctorSideEffects,
      ...m.warnings,
      m.whyGiven || '',
    ]),
    ...payload.combinedScans.flatMap((s) => [s.reportType, s.reason]),
  ];
  return parts.join(' ');
}

function drawStatusVectorIcon(
  doc: jsPDF,
  cx: number,
  cy: number,
  size: number,
  kind: 'check' | 'triangle' | 'octagon'
) {
  doc.setLineWidth(0.5);
  if (kind === 'check') {
    doc.setDrawColor(22, 163, 74);
    doc.setFillColor(240, 253, 244);
    doc.circle(cx, cy, size, 'FD');
    doc.setLineWidth(0.65);
    doc.line(cx - size * 0.45, cy + 0.2, cx - size * 0.1, cy + size * 0.38);
    doc.line(cx - size * 0.1, cy + size * 0.38, cx + size * 0.48, cy - size * 0.35);
    return;
  }
  if (kind === 'triangle') {
    doc.setDrawColor(180, 110, 0);
    doc.setFillColor(255, 251, 235);
    doc.triangle(cx, cy - size, cx - size, cy + size * 0.85, cx + size, cy + size * 0.85, 'FD');
    doc.setDrawColor(180, 110, 0);
    doc.setLineWidth(0.6);
    doc.line(cx, cy - size * 0.35, cx, cy + size * 0.25);
    doc.circle(cx, cy + size * 0.52, 0.35, 'F');
    return;
  }
  doc.setDrawColor(220, 38, 38);
  doc.setFillColor(254, 242, 242);
  doc.circle(cx, cy, size, 'FD');
  doc.setLineWidth(0.7);
  doc.line(cx, cy - size * 0.45, cx, cy + size * 0.15);
  doc.circle(cx, cy + size * 0.48, 0.4, 'F');
}

function drawVectorBodySilhouette(
  doc: jsPDF,
  originX: number,
  originY: number,
  widthMm: number,
  heightMm: number,
  view: 'front' | 'back',
  regionMap: Map<BodyRegionId, { index: number; sev: 'normal' | 'caution' | 'danger' }>
) {
  const sx = widthMm / 240;
  const sy = heightMm / 385;
  const px = (x: number) => originX + x * sx;
  const py = (y: number) => originY + y * sy;

  // Soft gray silhouette
  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);

  // Head
  doc.ellipse(px(120), py(40), 23 * sx, 23 * sy, 'FD');
  // Neck
  doc.rect(px(111), py(62), 18 * sx, 18 * sy, 'FD');
  // Torso
  doc.rect(px(86), py(80), 68 * sx, 95 * sy, 'FD');
  // Pelvis
  doc.rect(px(94), py(175), 52 * sx, 34 * sy, 'FD');
  // Arms
  doc.lines(
    [
      [-24 * sx, 68 * sy],
      [-10 * sx, 68 * sy],
      [12 * sx, 2 * sy],
      [10 * sx, -64 * sy],
      [17 * sx, -64 * sy],
    ],
    px(86),
    py(82),
    [1, 1],
    'FD',
    true
  );
  doc.lines(
    [
      [24 * sx, 68 * sy],
      [10 * sx, 68 * sy],
      [-12 * sx, 2 * sy],
      [-10 * sx, -64 * sy],
      [-17 * sx, -64 * sy],
    ],
    px(154),
    py(82),
    [1, 1],
    'FD',
    true
  );
  // Legs + feet
  doc.rect(px(97), py(209), 18 * sx, 146 * sy, 'FD');
  doc.rect(px(125), py(209), 18 * sx, 146 * sy, 'FD');
  doc.ellipse(px(103), py(363), 13 * sx, 7 * sy, 'FD');
  doc.ellipse(px(137), py(363), 13 * sx, 7 * sy, 'FD');

  if (view === 'back') {
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.5);
    doc.line(px(120), py(64), px(120), py(188));
  }

  const drawMarker = (rId: BodyRegionId, points: [number, number, number][]) => {
    const info = regionMap.get(rId);
    if (!info) return;
    const col = getSeverityColor(info.sev);

    points.forEach(([cx, cy, r], pIdx) => {
      // Subtle light halo
      doc.setFillColor(col.tint[0], col.tint[1], col.tint[2]);
      doc.setDrawColor(col.accent[0], col.accent[1], col.accent[2]);
      doc.setLineWidth(0.55);
      doc.circle(px(cx), py(cy), (r + 3.5) * sx, 'FD');

      // Core highlight
      doc.setFillColor(col.accent[0], col.accent[1], col.accent[2]);
      doc.circle(px(cx), py(cy), r * sx, 'F');

      // B&W-safe index number inside first marker
      if (pIdx === 0) {
        doc.setFont('NotoSans', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text(String(info.index), px(cx), py(cy) + 0.9, { align: 'center' });
      }
    });
  };

  if (view === 'front') {
    drawMarker('head', [[120, 36, 15]]);
    drawMarker('eyes_ears', [
      [111, 40, 5.5],
      [129, 40, 5.5],
    ]);
    drawMarker('thyroid', [[120, 70, 9.5]]);
    drawMarker('chest_lungs', [
      [105, 107, 11],
      [135, 107, 11],
    ]);
    drawMarker('heart', [[127, 109, 10.5]]);
    drawMarker('abdomen_liver', [[107, 139, 12]]);
    drawMarker('stomach_intestines', [[130, 150, 12]]);
    drawMarker('urinary_system', [[120, 182, 9.5]]);
    drawMarker('pelvis', [[120, 194, 13]]);
    drawMarker('shoulder_left', [[82, 87, 9.5]]);
    drawMarker('shoulder_right', [[158, 87, 9.5]]);
    drawMarker('arms_hands', [
      [63, 178, 9],
      [177, 178, 9],
    ]);
    drawMarker('knee_left', [[106, 282, 10.5]]);
    drawMarker('knee_right', [[134, 282, 10.5]]);
    drawMarker('feet', [
      [103, 362, 9.5],
      [137, 362, 9.5],
    ]);
  } else {
    drawMarker('head', [[120, 40, 15]]);
    drawMarker('neck_cervical', [[120, 75, 10]]);
    drawMarker('spine_thoracic', [[120, 114, 11]]);
    drawMarker('spine_lumbar', [[120, 156, 11]]);
    drawMarker('kidney', [
      [100, 146, 9],
      [140, 146, 9],
    ]);
    drawMarker('pelvis', [[120, 192, 12]]);
    drawMarker('shoulder_left', [[82, 87, 9.5]]);
    drawMarker('shoulder_right', [[158, 87, 9.5]]);
    drawMarker('arms_hands', [
      [63, 178, 9],
      [177, 178, 9],
    ]);
    drawMarker('knee_left', [[106, 282, 10.5]]);
    drawMarker('knee_right', [[134, 282, 10.5]]);
    drawMarker('feet', [
      [103, 362, 9.5],
      [137, 362, 9.5],
    ]);
  }
}

export async function generateFullReportPdf(
  payload: PdfReportPayload
): Promise<{ blob: Blob; filename: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const corpus = collectPayloadTextCorpus(payload);
  await registerPdfUnicodeFonts(doc, payload.options.language, corpus);

  let y = 14;

  const addNewPage = () => {
    doc.addPage();
    y = 18;
  };

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > MAX_Y) {
      addNewPage();
    }
  };

  const drawSectionHeading = (title: string) => {
    ensureSpace(12);
    y += 2;
    doc.setDrawColor(TEAL[0], TEAL[1], TEAL[2]);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_X, y - 2.5, MARGIN_X + CONTENT_W, y - 2.5);
    const lines = wrapMixedScriptLines(doc, title, CONTENT_W, 12, 'bold');
    y = drawMixedScriptLines(doc, lines, MARGIN_X, y + 2, 12, 5.2, 'bold', TEAL);
    y += 2;
  };

  const drawBulletBlock = (items: string[], numbered = false) => {
    for (let i = 0; i < items.length; i++) {
      const prefix = numbered ? `${i + 1}. ` : '• ';
      const text = `${prefix}${items[i]}`;
      const lines = wrapMixedScriptLines(doc, text, CONTENT_W - 4, 11, 'normal');
      const needed = lines.length * 5.2 + 2;
      ensureSpace(needed);
      y = drawMixedScriptLines(doc, lines, MARGIN_X + 2, y, 11, 5.0, 'normal', TEXT_BLACK);
      y += 1.5;
    }
  };

  // =========================================================================
  // 1. HEADER
  // =========================================================================
  doc.setFillColor(230, 243, 242);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, payload.header.patientLine ? 24 : 19, 2.5, 2.5, 'F');

  drawSingleLineMixedText(doc, payload.header.appName, MARGIN_X + 4, y + 6.5, 13, 'bold', TEAL);
  drawSingleLineMixedText(
    doc,
    `Report Date: ${payload.header.reportDate}`,
    MARGIN_X + CONTENT_W - 4,
    y + 6,
    9.5,
    'normal',
    TEXT_MUTED,
    'right'
  );

  const titleLines = wrapMixedScriptLines(
    doc,
    payload.header.reportTitle,
    CONTENT_W - 8,
    13,
    'bold'
  );
  drawMixedScriptLines(doc, titleLines.slice(0, 1), MARGIN_X + 4, y + 12.5, 13, 5.2, 'bold', TEXT_BLACK);

  drawSingleLineMixedText(
    doc,
    `Generated: ${payload.header.generatedAt}`,
    MARGIN_X + CONTENT_W - 4,
    y + 12.5,
    9,
    'normal',
    TEXT_MUTED,
    'right'
  );

  if (payload.header.patientLine) {
    drawSingleLineMixedText(
      doc,
      `Patient: ${payload.header.patientLine}`,
      MARGIN_X + 4,
      y + 19.5,
      10,
      'bold',
      TEXT_BLACK
    );
    y += 27;
  } else {
    y += 22;
  }

  // =========================================================================
  // 2. EMERGENCY BANNER (if red) + OVERALL STATUS
  // =========================================================================
  if (payload.overallStatus.hasEmergency) {
    const emLines = wrapMixedScriptLines(
      doc,
      payload.overallStatus.emergencyBannerText,
      CONTENT_W - 18,
      11.5,
      'bold'
    );
    const emH = Math.max(14, emLines.length * 5.2 + 6);
    ensureSpace(emH + 4);
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.75);
    doc.roundedRect(MARGIN_X, y, CONTENT_W, emH, 2.5, 2.5, 'FD');
    drawStatusVectorIcon(doc, MARGIN_X + 7, y + emH / 2, 3.6, 'octagon');
    drawMixedScriptLines(doc, emLines, MARGIN_X + 14, y + 6.5, 11.5, 5.2, 'bold', [185, 28, 28]);
    y += emH + 3.5;
  }

  const stCol = getSeverityColor(payload.overallStatus.severity);
  const stReasonLines = wrapMixedScriptLines(
    doc,
    payload.overallStatus.reason,
    CONTENT_W - 18,
    11,
    'normal'
  );
  const stCardH = Math.max(16, 9 + stReasonLines.length * 5);
  ensureSpace(stCardH + 4);

  doc.setFillColor(stCol.tint[0], stCol.tint[1], stCol.tint[2]);
  doc.setDrawColor(stCol.accent[0], stCol.accent[1], stCol.accent[2]);
  doc.setLineWidth(0.55);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, stCardH, 2.5, 2.5, 'FD');

  const statusShape =
    payload.overallStatus.severity === 'green'
      ? 'check'
      : payload.overallStatus.severity === 'yellow'
      ? 'triangle'
      : 'octagon';
  drawStatusVectorIcon(doc, MARGIN_X + 7.5, y + 7.5, 3.8, statusShape);

  drawSingleLineMixedText(
    doc,
    payload.overallStatus.statusDisplay,
    MARGIN_X + 14.5,
    y + 8,
    13,
    'bold',
    TEXT_BLACK
  );
  drawMixedScriptLines(
    doc,
    stReasonLines,
    MARGIN_X + 14.5,
    y + 13.5,
    11,
    4.9,
    'normal',
    TEXT_BLACK
  );
  y += stCardH + 5;

  await yieldToUi();

  // =========================================================================
  // 3. VECTOR BODY MAP SNAPSHOT (Front + Back SVG-equivalent vector + Legend)
  // =========================================================================
  const legendCount = payload.bodyMap.legendRows.length;
  const mapCardH = Math.max(76, 18 + legendCount * 9.5);
  ensureSpace(mapCardH + 8);

  drawSectionHeading(payload.labels.sectionBodyMap);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(CARD_BORDER[0], CARD_BORDER[1], CARD_BORDER[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, mapCardH, 2.5, 2.5, 'FD');

  const indexedRegions = new Map<
    BodyRegionId,
    { index: number; sev: 'normal' | 'caution' | 'danger' }
  >();
  payload.bodyMap.legendRows.forEach((lr, idx) => {
    indexedRegions.set(lr.regionId, { index: idx + 1, sev: lr.severity });
  });

  // Draw Front & Back diagrams on the left side
  drawSingleLineMixedText(doc, payload.labels.frontView, MARGIN_X + 22, y + 6, 9.5, 'bold', TEXT_MUTED, 'center');
  drawVectorBodySilhouette(doc, MARGIN_X + 3, y + 8, 38, 61, 'front', indexedRegions);

  drawSingleLineMixedText(doc, payload.labels.backView, MARGIN_X + 66, y + 6, 9.5, 'bold', TEXT_MUTED, 'center');
  drawVectorBodySilhouette(doc, MARGIN_X + 47, y + 8, 38, 61, 'back', indexedRegions);

  // Legend column on the right side
  let legY = y + 8;
  const legX = MARGIN_X + 92;
  const legW = CONTENT_W - 96;

  if (payload.bodyMap.legendRows.length === 0) {
    const noRegLines = wrapMixedScriptLines(
      doc,
      'No specific body area highlighted for this report.',
      legW,
      10.5,
      'normal'
    );
    drawMixedScriptLines(doc, noRegLines, legX, legY + 6, 10.5, 4.8, 'normal', TEXT_MUTED);
  } else {
    payload.bodyMap.legendRows.forEach((row, idx) => {
      const col = getSeverityColor(row.severity);
      const isSystemic = SYSTEMIC_REGION_IDS.has(row.regionId);
      // Number badge
      doc.setFillColor(col.accent[0], col.accent[1], col.accent[2]);
      doc.circle(legX + 3, legY + 2.3, 2.6, 'F');
      doc.setFont('NotoSans', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(String(idx + 1), legX + 3, legY + 3.2, { align: 'center' });

      const line1 = `${row.areaLabel}${isSystemic ? ' [General]' : ''}`;
      drawSingleLineMixedText(doc, line1, legX + 8, legY + 3.2, 10, 'bold', TEXT_BLACK);
      const line2 = `${row.kindLabel} — ${row.statusText}`;
      drawSingleLineMixedText(doc, line2, legX + 8, legY + 7.2, 8.8, 'normal', col.accent);
      legY += 9.5;
    });
  }

  y += mapCardH + 5;
  await yieldToUi();

  // =========================================================================
  // 4. ALL TEST RESULTS TABLE (Normal + Abnormal, grouped by category, repeated headers)
  // =========================================================================
  drawSectionHeading(`${payload.labels.sectionAllTests} (${payload.allFindingsCount})`);

  const isCombined = payload.header.isCombined;
  const tableHeadRow = isCombined
    ? [
        payload.labels.colTest,
        payload.labels.colValue,
        payload.labels.colRange,
        payload.labels.colStatus,
        payload.labels.colSource,
        payload.labels.colArea,
        payload.labels.colScan,
      ]
    : [
        payload.labels.colTest,
        payload.labels.colValue,
        payload.labels.colRange,
        payload.labels.colStatus,
        payload.labels.colSource,
        payload.labels.colArea,
      ];

  const colCount = tableHeadRow.length;

  interface CellMeta {
    text: string;
    style: PdfFontStyle;
    color: [number, number, number];
    wrappedLines?: ScriptRun[][];
    isCategoryHeader?: boolean;
  }

  const bodyRows: RowInput[] = [];
  const cellMetaLookup = new WeakMap<object, CellMeta>();

  for (const catGroup of payload.findingCategories) {
    // Category sub-header row spanning all columns
    const catCellObj = {
      content: catGroup.categoryName,
      colSpan: colCount,
      styles: {
        fillColor: [230, 243, 242] as [number, number, number],
        fontStyle: 'bold' as const,
      },
    };
    cellMetaLookup.set(catCellObj, {
      text: catGroup.categoryName,
      style: 'bold',
      color: TEAL,
      isCategoryHeader: true,
    });
    bodyRows.push([catCellObj]);

    for (const row of catGroup.rows) {
      const rowTint: [number, number, number] =
        row.status === 'critical'
          ? [254, 242, 242]
          : row.status === 'high' || row.status === 'low'
          ? [255, 251, 235]
          : [255, 255, 255];

      const statusCol = getSeverityColor(
        row.status === 'critical' ? 'danger' : row.status === 'normal' ? 'normal' : 'caution'
      );

      const valueCombined = `${row.value}${row.unit && row.unit !== '—' ? ` ${row.unit}` : ''}`;

      const rawCols: { text: string; style: PdfFontStyle; color: [number, number, number] }[] = [
        { text: row.testName, style: 'bold', color: TEXT_BLACK },
        { text: valueCombined, style: 'bold', color: TEXT_BLACK },
        { text: row.normalRange, style: 'normal', color: TEXT_MUTED },
        { text: row.statusText, style: 'bold', color: statusCol.accent },
        { text: row.rangeSourceText, style: 'normal', color: TEXT_MUTED },
        { text: row.relatedAreaText, style: 'normal', color: TEXT_BLACK },
      ];
      if (isCombined) {
        rawCols.push({ text: row.scanLabel || '—', style: 'normal', color: TEAL });
      }

      const rowCells = rawCols.map((c) => {
        const cellDef = {
          content: c.text,
          styles: {
            fillColor: rowTint,
          },
        };
        cellMetaLookup.set(cellDef, c);
        return cellDef;
      });
      bodyRows.push(rowCells);
    }
  }

  const colWidths: Record<number, { cellWidth: number }> = isCombined
    ? {
        0: { cellWidth: 40 },
        1: { cellWidth: 23 },
        2: { cellWidth: 26 },
        3: { cellWidth: 25 },
        4: { cellWidth: 27 },
        5: { cellWidth: 27 },
        6: { cellWidth: 18 },
      }
    : {
        0: { cellWidth: 44 },
        1: { cellWidth: 25 },
        2: { cellWidth: 30 },
        3: { cellWidth: 27 },
        4: { cellWidth: 30 },
        5: { cellWidth: 30 },
      };

  const headCells = tableHeadRow.map((title) => {
    const obj = { content: title };
    cellMetaLookup.set(obj, { text: title, style: 'bold', color: [255, 255, 255] });
    return obj;
  });

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_X, right: MARGIN_X, top: 18, bottom: 20 },
    head: [headCells],
    body: bodyRows,
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    theme: 'grid',
    styles: {
      font: 'NotoSans',
      fontSize: 9.5,
      cellPadding: { top: 2.2, right: 2.2, bottom: 2.2, left: 2.2 },
      lineColor: LINE_GRAY,
      lineWidth: 0.25,
      valign: 'middle',
    },
    headStyles: {
      fillColor: TEAL,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9.5,
    },
    columnStyles: colWidths,
    didParseCell: (data: CellHookData) => {
      const rawObj = data.cell.raw as object | undefined;
      if (!rawObj) return;
      const meta = cellMetaLookup.get(rawObj);
      if (!meta) return;

      const fontSize = data.section === 'head' || meta.isCategoryHeader ? 9.5 : 9.2;
      const colW =
        typeof data.cell.styles.cellWidth === 'number'
          ? data.cell.styles.cellWidth
          : data.cell.width || 30;
      const innerW = Math.max(10, colW - 4.4);
      const wrapped = wrapMixedScriptLines(doc, meta.text, innerW, fontSize, meta.style);
      meta.wrappedLines = wrapped;

      // Clear built-in string drawing so didDrawCell draws pure script-runs without missing glyphs
      data.cell.text = [];
      const lineH = 4.1;
      const neededHeight = Math.max(7.2, wrapped.length * lineH + 3.8);
      if (data.cell.styles.minCellHeight < neededHeight) {
        data.cell.styles.minCellHeight = neededHeight;
      }
    },
    didDrawCell: (data: CellHookData) => {
      const rawObj = data.cell.raw as object | undefined;
      if (!rawObj) return;
      const meta = cellMetaLookup.get(rawObj);
      if (!meta || !meta.wrappedLines) return;

      const fontSize = data.section === 'head' || meta.isCategoryHeader ? 9.5 : 9.2;
      const startTextY = data.cell.y + 4.8;
      drawMixedScriptLines(
        doc,
        meta.wrappedLines,
        data.cell.x + 2.2,
        startTextY,
        fontSize,
        4.1,
        meta.style,
        meta.color
      );
    },
  });

  const lastTableY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable
    ?.finalY;
  y = (lastTableY || y) + 6;
  await yieldToUi();

  // =========================================================================
  // 5. ABNORMAL FINDINGS EXPLANATIONS ("What this means")
  // =========================================================================
  if (payload.abnormalExplanations.length > 0) {
    drawSectionHeading(payload.labels.sectionExplanations);

    for (const item of payload.abnormalExplanations) {
      const headerStr = `${item.testName}: ${item.valueText} ${item.statusText}${
        item.scanLabel ? ` (${item.scanLabel})` : ''
      }`;
      const titleLines = wrapMixedScriptLines(doc, headerStr, CONTENT_W - 8, 11, 'bold');
      const bodyLines = wrapMixedScriptLines(doc, item.explanation, CONTENT_W - 8, 10.5, 'normal');
      const cardH = titleLines.length * 4.8 + bodyLines.length * 4.6 + 6;

      ensureSpace(cardH + 3);
      const col = getSeverityColor(item.status === 'critical' ? 'danger' : 'caution');
      doc.setFillColor(col.tint[0], col.tint[1], col.tint[2]);
      doc.setDrawColor(CARD_BORDER[0], CARD_BORDER[1], CARD_BORDER[2]);
      doc.setLineWidth(0.35);
      doc.roundedRect(MARGIN_X, y, CONTENT_W, cardH, 2, 2, 'FD');

      let cy = drawMixedScriptLines(doc, titleLines, MARGIN_X + 4, y + 5, 11, 4.8, 'bold', TEXT_BLACK);
      drawMixedScriptLines(doc, bodyLines, MARGIN_X + 4, cy + 0.5, 10.5, 4.6, 'normal', TEXT_BLACK);
      y += cardH + 2.5;
    }
    await yieldToUi();
  }

  // =========================================================================
  // 6. SYMPTOMS TO WATCH FOR
  // =========================================================================
  if (payload.symptoms.length > 0) {
    drawSectionHeading(payload.labels.sectionSymptoms);
    drawBulletBlock(payload.symptoms, false);
    y += 2;
  }

  // =========================================================================
  // 7. HOW URGENT
  // =========================================================================
  drawSectionHeading(payload.labels.sectionUrgency);
  const urgLines = wrapMixedScriptLines(doc, payload.urgency.label, CONTENT_W - 8, 11, 'bold');
  const urgH = urgLines.length * 5 + 6;
  ensureSpace(urgH + 3);
  const urgCol = getSeverityColor(
    payload.urgency.level === 'today' ? 'danger' : payload.urgency.level === 'soon' ? 'caution' : 'normal'
  );
  doc.setFillColor(urgCol.tint[0], urgCol.tint[1], urgCol.tint[2]);
  doc.setDrawColor(urgCol.accent[0], urgCol.accent[1], urgCol.accent[2]);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, urgH, 2, 2, 'FD');
  drawMixedScriptLines(doc, urgLines, MARGIN_X + 4, y + 5.5, 11, 5, 'bold', TEXT_BLACK);
  y += urgH + 4;

  // =========================================================================
  // 8. SAFE CARE STEPS
  // =========================================================================
  if (payload.safeSteps.length > 0) {
    drawSectionHeading(payload.labels.sectionSafeSteps);
    drawBulletBlock(payload.safeSteps, false);
    y += 2;
  }

  // =========================================================================
  // 9. QUESTIONS FOR YOUR DOCTOR
  // =========================================================================
  if (payload.doctorQuestions.length > 0) {
    drawSectionHeading(payload.labels.sectionQuestions);
    drawBulletBlock(payload.doctorQuestions, true);
    y += 2;
  }

  await yieldToUi();

  // =========================================================================
  // 10. MEDICINES SECTION (if linked or included)
  // =========================================================================
  if (payload.medicines.length > 0) {
    drawSectionHeading(payload.labels.sectionMedicines);

    for (const med of payload.medicines) {
      const blockLines: { label: string; value: string; bold?: boolean; warn?: boolean }[] = [
        { label: '', value: `${med.brand} (${med.strength})`, bold: true },
        { label: `${payload.labels.medSalt}: `, value: med.salt },
        { label: `${payload.labels.medWhoCanGive}: `, value: med.whoCanGive, bold: true },
        { label: `${payload.labels.medUsedFor}: `, value: med.usedFor },
      ];
      if (med.commonSideEffects.length > 0) {
        blockLines.push({
          label: `${payload.labels.medSideEffectsCommon}: `,
          value: med.commonSideEffects.join(', '),
        });
      }
      if (med.seeDoctorSideEffects.length > 0) {
        blockLines.push({
          label: `${payload.labels.medSideEffectsDoctor}: `,
          value: med.seeDoctorSideEffects.join(', '),
          warn: true,
        });
      }
      if (med.warnings.length > 0) {
        blockLines.push({
          label: `${payload.labels.medWarnings}: `,
          value: med.warnings.join(' | '),
          warn: true,
        });
      }
      if (med.whyGiven) {
        blockLines.push({
          label: `${payload.labels.medWhyGiven}: `,
          value: med.whyGiven,
        });
      }

      const wrappedEntries = blockLines.map((bl) => ({
        lines: wrapMixedScriptLines(doc, `${bl.label}${bl.value}`, CONTENT_W - 8, 10.2, bl.bold ? 'bold' : 'normal'),
        style: (bl.bold ? 'bold' : 'normal') as PdfFontStyle,
        color: (bl.warn ? [185, 28, 28] : TEXT_BLACK) as [number, number, number],
      }));

      const totalLines = wrappedEntries.reduce((acc, e) => acc + e.lines.length, 0);
      const cardH = totalLines * 4.5 + 8;
      ensureSpace(cardH + 3);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(CARD_BORDER[0], CARD_BORDER[1], CARD_BORDER[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(MARGIN_X, y, CONTENT_W, cardH, 2.5, 2.5, 'FD');

      let cy = y + 5.5;
      for (const entry of wrappedEntries) {
        cy = drawMixedScriptLines(doc, entry.lines, MARGIN_X + 4, cy, 10.2, 4.5, entry.style, entry.color);
      }
      y += cardH + 3;
    }
    await yieldToUi();
  }

  // =========================================================================
  // 11. COMBINED REPORT SCANS LIST
  // =========================================================================
  if (payload.combinedScans.length > 0) {
    drawSectionHeading(payload.labels.sectionCombined);

    if (payload.combinedMismatchWarning) {
      const mLines = wrapMixedScriptLines(doc, payload.combinedMismatchWarning, CONTENT_W - 8, 10.5, 'bold');
      const mH = mLines.length * 4.8 + 5;
      ensureSpace(mH + 3);
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(245, 158, 11);
      doc.roundedRect(MARGIN_X, y, CONTENT_W, mH, 2, 2, 'FD');
      drawMixedScriptLines(doc, mLines, MARGIN_X + 4, y + 5, 10.5, 4.8, 'bold', [146, 64, 14]);
      y += mH + 3;
    }

    for (const scan of payload.combinedScans) {
      const lineStr = `${scan.scanLabel} (${scan.dateLabel}): ${scan.reportType} — [${scan.statusLabel}]`;
      const sLines = wrapMixedScriptLines(doc, `${lineStr}\n${scan.reason}`, CONTENT_W - 8, 10.2, 'normal');
      const cardH = sLines.length * 4.6 + 5;
      ensureSpace(cardH + 2.5);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(CARD_BORDER[0], CARD_BORDER[1], CARD_BORDER[2]);
      doc.roundedRect(MARGIN_X, y, CONTENT_W, cardH, 2, 2, 'FD');
      drawMixedScriptLines(doc, sLines, MARGIN_X + 4, y + 5, 10.2, 4.6, 'normal', TEXT_BLACK);
      y += cardH + 2.5;
    }
    await yieldToUi();
  }

  // =========================================================================
  // 12. VECTOR TREND CHARTS (if history >= 2 points)
  // =========================================================================
  if (payload.trends.length > 0) {
    drawSectionHeading(payload.labels.sectionTrends);

    for (const tr of payload.trends) {
      const cardH = 38;
      ensureSpace(cardH + 4);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(CARD_BORDER[0], CARD_BORDER[1], CARD_BORDER[2]);
      doc.setLineWidth(0.35);
      doc.roundedRect(MARGIN_X, y, CONTENT_W, cardH, 2, 2, 'FD');

      drawSingleLineMixedText(
        doc,
        `${tr.markerName} (${tr.changeSummary})`,
        MARGIN_X + 4,
        y + 6,
        10.5,
        'bold',
        TEXT_BLACK
      );

      const chartX = MARGIN_X + 12;
      const chartY = y + 11;
      const chartW = CONTENT_W - 24;
      const chartH = 19;

      // Baseline & axis
      doc.setDrawColor(LINE_GRAY[0], LINE_GRAY[1], LINE_GRAY[2]);
      doc.setLineWidth(0.25);
      doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH);
      doc.line(chartX, chartY, chartX, chartY + chartH);

      const values = tr.history.map((h) => h.value);
      const minV = Math.min(...values);
      const maxV = Math.max(...values);
      const span = maxV - minV || 1;

      const pts = tr.history.map((pt, idx) => {
        const px =
          chartX + 8 + (idx / Math.max(1, tr.history.length - 1)) * (chartW - 16);
        const py = chartY + chartH - 3 - ((pt.value - minV) / span) * (chartH - 7);
        return {
          x: px,
          y: py,
          valLabel: String(pt.value),
          dateLabel: new Date(pt.date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
          }),
        };
      });

      // Vector line segments
      doc.setDrawColor(TEAL[0], TEAL[1], TEAL[2]);
      doc.setLineWidth(0.7);
      for (let i = 0; i < pts.length - 1; i++) {
        doc.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
      }

      // Data points & labels
      for (const p of pts) {
        doc.setFillColor(TEAL[0], TEAL[1], TEAL[2]);
        doc.circle(p.x, p.y, 1.3, 'F');
        doc.setFont('NotoSans', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(TEXT_BLACK[0], TEXT_BLACK[1], TEXT_BLACK[2]);
        doc.text(p.valLabel, p.x, p.y - 2, { align: 'center' });

        doc.setFont('NotoSans', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
        doc.text(p.dateLabel, p.x, chartY + chartH + 4, { align: 'center' });
      }

      y += cardH + 3;
    }
  }

  // =========================================================================
  // 13. RUNNING HEADER (pages 2+) & FOOTER + PAGE NUMBERS ON EVERY PAGE
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);

    // Subtle running header on pages 2..N
    if (pageNum > 1) {
      drawSingleLineMixedText(
        doc,
        `ReportSamjho • ${payload.header.reportTitle}`,
        MARGIN_X,
        10,
        8.5,
        'bold',
        TEAL
      );
      doc.setDrawColor(LINE_GRAY[0], LINE_GRAY[1], LINE_GRAY[2]);
      doc.setLineWidth(0.25);
      doc.line(MARGIN_X, 12, MARGIN_X + CONTENT_W, 12);
    }

    // Footer on EVERY page (Section 13)
    doc.setDrawColor(LINE_GRAY[0], LINE_GRAY[1], LINE_GRAY[2]);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, PAGE_H - 15, MARGIN_X + CONTENT_W, PAGE_H - 15);

    const fLines = wrapMixedScriptLines(doc, payload.footerText, CONTENT_W - 28, 8.2, 'normal');
    drawMixedScriptLines(
      doc,
      fLines.slice(0, 2),
      MARGIN_X,
      PAGE_H - 11,
      8.2,
      3.5,
      'normal',
      TEXT_MUTED
    );

    drawSingleLineMixedText(
      doc,
      `Page ${pageNum} of ${totalPages}`,
      MARGIN_X + CONTENT_W,
      PAGE_H - 10,
      8.5,
      'bold',
      TEXT_BLACK,
      'right'
    );
  }

  const blob = doc.output('blob');
  const safeSlug = payload.header.reportTitle
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  const filename = `ReportSamjho-${safeSlug || 'Report'}.pdf`;

  return { blob, filename };
}
