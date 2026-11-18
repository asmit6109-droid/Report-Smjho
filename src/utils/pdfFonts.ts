import type { jsPDF } from 'jspdf';
import { SupportedLanguage } from './translations';

export type PdfFontFamily = 'NotoSans' | 'NotoSansDevanagari' | 'NotoSansOriya';
export type PdfFontStyle = 'normal' | 'bold';

export interface ScriptRun {
  font: PdfFontFamily;
  text: string;
}

const FONT_FILES: Record<PdfFontFamily, Record<PdfFontStyle, string>> = {
  NotoSans: {
    normal: 'NotoSans-Regular.ttf',
    bold: 'NotoSans-Bold.ttf',
  },
  NotoSansDevanagari: {
    normal: 'NotoSansDevanagari-Regular.ttf',
    bold: 'NotoSansDevanagari-Bold.ttf',
  },
  NotoSansOriya: {
    normal: 'NotoSansOriya-Regular.ttf',
    bold: 'NotoSansOriya-Bold.ttf',
  },
};

const base64Cache = new Map<string, string>();
let customBytesFetcher: ((filename: string) => Promise<Uint8Array>) | null = null;

export function setPdfFontBytesFetcher(
  fetcher: ((filename: string) => Promise<Uint8Array>) | null
) {
  customBytesFetcher = fetcher;
}

function uint8ToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

async function fetchFontBase64(filename: string): Promise<string> {
  const cached = base64Cache.get(filename);
  if (cached) return cached;

  let bytes: Uint8Array;
  if (customBytesFetcher) {
    bytes = await customBytesFetcher(filename);
  } else {
    const res = await fetch(`/fonts/${filename}`, { cache: 'force-cache' });
    if (!res.ok) {
      throw new Error(`Could not load font ${filename}`);
    }
    const buf = await res.arrayBuffer();
    bytes = new Uint8Array(buf);
  }

  const b64 = uint8ToBase64(bytes);
  base64Cache.set(filename, b64);
  return b64;
}

function getRequiredFamilies(lang: SupportedLanguage, textCorpus?: string): PdfFontFamily[] {
  const families: Set<PdfFontFamily> = new Set(['NotoSans']);
  if (lang === 'hi' || (textCorpus && /[\u0900-\u097F]/.test(textCorpus))) {
    families.add('NotoSansDevanagari');
  }
  if (lang === 'or' || (textCorpus && /[\u0B00-\u0B7F]/.test(textCorpus))) {
    families.add('NotoSansOriya');
  }
  return Array.from(families);
}

export async function registerPdfUnicodeFonts(
  doc: jsPDF,
  language: SupportedLanguage,
  textCorpus?: string
): Promise<void> {
  const families = getRequiredFamilies(language, textCorpus);

  for (const family of families) {
    for (const style of ['normal', 'bold'] as const) {
      const filename = FONT_FILES[family][style];
      const b64 = await fetchFontBase64(filename);
      doc.addFileToVFS(filename, b64);
      doc.addFont(filename, family, style);
    }
  }
  doc.setFont('NotoSans', 'normal');
}

function sanitizeCommonSymbols(text: string): string {
  return (text || '')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/✓/g, '+')
    .replace(/✕/g, 'x')
    .replace(/[\u2022]/g, '•')
    .replace(/\u00A0/g, ' ');
}

function isFontLoaded(doc: jsPDF, family: PdfFontFamily): boolean {
  const list = doc.getFontList() as Record<string, string[]>;
  return Boolean(list[family]);
}

function getCharCodeMap(doc: jsPDF, family: PdfFontFamily, style: PdfFontStyle): Record<number, number> | null {
  try {
    doc.setFont(family, style);
    const fontObj = doc.getFont() as unknown as {
      metadata?: { cmap?: { unicode?: { codeMap?: Record<number, number> } } };
    };
    return fontObj?.metadata?.cmap?.unicode?.codeMap || null;
  } catch {
    return null;
  }
}

function detectCharFont(doc: jsPDF, ch: string): PdfFontFamily {
  const code = ch.charCodeAt(0);
  if (code >= 0x0900 && code <= 0x097f && isFontLoaded(doc, 'NotoSansDevanagari')) {
    return 'NotoSansDevanagari';
  }
  if (code >= 0x0b00 && code <= 0x0b7f && isFontLoaded(doc, 'NotoSansOriya')) {
    return 'NotoSansOriya';
  }
  return 'NotoSans';
}

export function splitIntoScriptRuns(
  doc: jsPDF,
  rawText: string,
  style: PdfFontStyle = 'normal'
): ScriptRun[] {
  const cleaned = sanitizeCommonSymbols(rawText);
  if (!cleaned) return [];

  const cmapCache: Partial<Record<PdfFontFamily, Record<number, number> | null>> = {};
  const getCmap = (fam: PdfFontFamily) => {
    if (!(fam in cmapCache)) {
      cmapCache[fam] = isFontLoaded(doc, fam) ? getCharCodeMap(doc, fam, style) : null;
    }
    return cmapCache[fam];
  };

  const runs: ScriptRun[] = [];
  for (const ch of cleaned) {
    const code = ch.charCodeAt(0);
    if (code < 32 && ch !== ' ') continue;

    let targetFont = detectCharFont(doc, ch);
    let cmap = getCmap(targetFont);

    // Fallback to NotoSans if char missing in regional cmap; drop unsupported emojis cleanly
    if (cmap && cmap[code] === undefined) {
      if (targetFont !== 'NotoSans') {
        const latinCmap = getCmap('NotoSans');
        if (latinCmap && latinCmap[code] !== undefined) {
          targetFont = 'NotoSans';
        } else {
          continue;
        }
      } else {
        continue;
      }
    }

    const last = runs[runs.length - 1];
    if (last && last.font === targetFont) {
      last.text += ch;
    } else {
      runs.push({ font: targetFont, text: ch });
    }
  }

  return runs;
}

export function measureRunWidthMm(
  doc: jsPDF,
  run: ScriptRun,
  fontSize: number,
  style: PdfFontStyle
): number {
  doc.setFont(run.font, style);
  doc.setFontSize(fontSize);
  const unitW = doc.getStringUnitWidth(run.text);
  const scaleFactor = doc.internal.scaleFactor || 72 / 25.4;
  return (unitW * fontSize) / scaleFactor;
}

export function measureMixedTextWidthMm(
  doc: jsPDF,
  text: string,
  fontSize: number,
  style: PdfFontStyle = 'normal'
): number {
  const runs = splitIntoScriptRuns(doc, text, style);
  let total = 0;
  for (const r of runs) {
    total += measureRunWidthMm(doc, r, fontSize, style);
  }
  return total;
}

/**
 * Splits multi-script text (English + Hindi + Odia mixed) cleanly to fit inside maxWidthMm.
 */
export function wrapMixedScriptLines(
  doc: jsPDF,
  rawText: string,
  maxWidthMm: number,
  fontSize: number,
  style: PdfFontStyle = 'normal'
): ScriptRun[][] {
  const paragraphs = sanitizeCommonSymbols(rawText).split(/\r?\n/);
  const resultLines: ScriptRun[][] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      resultLines.push([]);
      continue;
    }

    const words = trimmed.split(/\s+/);
    let currentLineText = '';

    for (const word of words) {
      const candidate = currentLineText ? `${currentLineText} ${word}` : word;
      if (measureMixedTextWidthMm(doc, candidate, fontSize, style) <= maxWidthMm) {
        currentLineText = candidate;
      } else {
        if (currentLineText) {
          resultLines.push(splitIntoScriptRuns(doc, currentLineText, style));
          currentLineText = '';
        }
        // If a single word itself exceeds maxWidthMm, split it cleanly by characters
        if (measureMixedTextWidthMm(doc, word, fontSize, style) > maxWidthMm) {
          let chunk = '';
          for (const ch of word) {
            if (measureMixedTextWidthMm(doc, chunk + ch, fontSize, style) > maxWidthMm && chunk) {
              resultLines.push(splitIntoScriptRuns(doc, chunk, style));
              chunk = ch;
            } else {
              chunk += ch;
            }
          }
          currentLineText = chunk;
        } else {
          currentLineText = word;
        }
      }
    }

    if (currentLineText) {
      resultLines.push(splitIntoScriptRuns(doc, currentLineText, style));
    }
  }

  return resultLines;
}

export function drawMixedScriptLines(
  doc: jsPDF,
  lines: ScriptRun[][],
  x: number,
  startY: number,
  fontSize: number,
  lineHeightMm: number,
  style: PdfFontStyle = 'normal',
  colorRGB: [number, number, number] = [0, 0, 0]
): number {
  doc.setTextColor(colorRGB[0], colorRGB[1], colorRGB[2]);
  doc.setFontSize(fontSize);

  let y = startY;
  for (const lineRuns of lines) {
    let curX = x;
    for (const run of lineRuns) {
      doc.setFont(run.font, style);
      doc.setFontSize(fontSize);
      doc.text(run.text, curX, y);
      curX += measureRunWidthMm(doc, run, fontSize, style);
    }
    y += lineHeightMm;
  }
  return y;
}

export function drawSingleLineMixedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  style: PdfFontStyle = 'normal',
  colorRGB: [number, number, number] = [0, 0, 0],
  align: 'left' | 'right' | 'center' = 'left'
): void {
  const runs = splitIntoScriptRuns(doc, text, style);
  const totalW =
    align === 'left'
      ? 0
      : runs.reduce((acc, r) => acc + measureRunWidthMm(doc, r, fontSize, style), 0);

  let curX = align === 'right' ? x - totalW : align === 'center' ? x - totalW / 2 : x;
  doc.setTextColor(colorRGB[0], colorRGB[1], colorRGB[2]);

  for (const run of runs) {
    doc.setFont(run.font, style);
    doc.setFontSize(fontSize);
    doc.text(run.text, curX, y);
    curX += measureRunWidthMm(doc, run, fontSize, style);
  }
}
