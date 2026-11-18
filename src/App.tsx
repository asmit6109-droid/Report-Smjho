import React, { useRef, useState } from 'react';
import { ReportAnalysis, UserProfile } from './types/report';
import {
  MedicineAnalysis,
  MedicineStep1Result,
  PrescriptionLineItem,
  PrescriptionRecord,
} from './types/medicine';
import { SupportedLanguage, translations } from './utils/translations';
import { medicineTranslations } from './utils/medicineTranslations';
import {
  getStoredProfile,
  saveStoredProfile,
  saveReportToStorage,
  getHealthProfile,
  saveHealthProfile,
} from './utils/storage';
import { compressImage } from './utils/imageQuality';
import { isPdfFile, MAX_SCAN_PAGES, renderPdfToJpegPages } from './utils/pdfUtils';
import { getClientDeviceId, submitScanJobWithPolling } from './utils/uploadJob';
import { demoReports } from './utils/demoData';
import { demoMedicines } from './utils/demoMedicineData';
import { triggerLightHaptic } from './utils/haptics';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { DisclaimerModal } from './components/DisclaimerModal';
import { CameraScanner } from './components/CameraScanner';
import { ProcessingScreen } from './components/ProcessingScreen';
import { Dashboard } from './components/Dashboard';
import { HistoryScreen } from './components/HistoryScreen';
import { SettingsModal } from './components/SettingsModal';
import { MedicineResultScreen } from './components/MedicineResultScreen';
import {
  PrescriptionVerifyScreen,
  PrescriptionResultsScreen,
} from './components/PrescriptionScannerFlow';
import { MedicineConfirmScreen } from './components/medicine/MedicineConfirmScreen';
import { HealthProfileModal } from './components/HealthProfileModal';
import {
  Camera,
  History,
  Settings,
  WifiOff,
  AlertCircle,
  HeartPulse,
  RefreshCw,
  Edit3,
  Upload,
} from 'lucide-react';

type ScreenName =
  | 'home'
  | 'scan'
  | 'dashboard'
  | 'history'
  | 'medicine_scan'
  | 'medicine_confirm'
  | 'medicine_result'
  | 'prescription_scan'
  | 'prescription_verify'
  | 'prescription_results';

export default function App() {
  const [profile, setProfile] = useState<UserProfile>(getStoredProfile());
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('home');
  const [historyTab, setHistoryTab] = useState<'reports' | 'medicines'>('reports');
  const [scanInitialMode, setScanInitialMode] = useState<'camera' | 'gallery'>('camera');
  const [activeReport, setActiveReport] = useState<ReportAnalysis | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingMode, setProcessingMode] = useState<
    'report' | 'medicine_identify' | 'medicine_verify' | 'prescription'
  >('report');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showManualMedOption, setShowManualMedOption] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showDemoSelector, setShowDemoSelector] = useState<boolean>(false);
  const [showDemoMedicineSelector, setShowDemoMedicineSelector] = useState<boolean>(false);
  const [prescriptionProgressText, setPrescriptionProgressText] = useState<string>('');
  const [scanProgressTitle, setScanProgressTitle] = useState<string | undefined>(undefined);
  const [scanProgressSubtitle, setScanProgressSubtitle] = useState<string | undefined>(undefined);

  // Hidden direct gallery file inputs for 1-tap upload under each Home button
  const reportFileRef = useRef<HTMLInputElement | null>(null);
  const medicineFileRef = useRef<HTMLInputElement | null>(null);

  // Medicine 3-step pipeline states
  const [pendingMedicineImages, setPendingMedicineImages] = useState<string[]>([]);
  const [step1Result, setStep1Result] = useState<MedicineStep1Result | null>(null);
  const [isManualConfirmMode, setIsManualConfirmMode] = useState<boolean>(false);
  const [activeMedicine, setActiveMedicine] = useState<MedicineAnalysis | null>(null);
  const [medicineReturnScreen, setMedicineReturnScreen] = useState<
    'home' | 'history' | 'prescription_results'
  >('home');

  const [pendingMedIdentifyRetry, setPendingMedIdentifyRetry] = useState<string[] | null>(null);
  const [pendingMedVerifyRetry, setPendingMedVerifyRetry] = useState<{
    step1: MedicineStep1Result;
    problem: string;
    docImages: string[];
  } | null>(null);

  // Prescription states
  const [pendingPrescriptionImages, setPendingPrescriptionImages] = useState<string[] | null>(null);
  const [prescriptionDraft, setPrescriptionDraft] = useState<{
    doctor_name?: string | null;
    date?: string | null;
    lines: PrescriptionLineItem[];
  } | null>(null);
  const [activePrescription, setActivePrescription] = useState<PrescriptionRecord | null>(null);
  const [pendingImages, setPendingImages] = useState<string[] | null>(null);

  const isOnline = useOnlineStatus();
  const currentLanguage: SupportedLanguage = profile.language || 'en';
  const t = translations[currentLanguage];
  const mt = medicineTranslations[currentLanguage];

  const handleLanguageChange = (lang: SupportedLanguage) => {
    const updated = { ...profile, language: lang };
    setProfile(updated);
    saveStoredProfile(updated);
  };

  const handleProfileComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    saveStoredProfile(newProfile);
  };

  const handleOpenScanner = () => {
    triggerLightHaptic();
    if (!isOnline) {
      setErrorMessage(t.offlineScanNotice);
      return;
    }
    setErrorMessage(null);
    setShowManualMedOption(false);
    setScanInitialMode('camera');
    setCurrentScreen('scan');
  };

  const handleOpenMedicineScanner = (mode: 'camera' | 'gallery' = 'camera') => {
    triggerLightHaptic();
    if (!isOnline) {
      setErrorMessage(t.offlineScanNotice);
      return;
    }
    setErrorMessage(null);
    setShowManualMedOption(false);
    setScanInitialMode(mode);
    setCurrentScreen('medicine_scan');
  };

  const handleOpenPrescriptionScanner = (mode: 'camera' | 'gallery' = 'camera') => {
    triggerLightHaptic();
    if (!isOnline) {
      setErrorMessage(t.offlineScanNotice);
      return;
    }
    setErrorMessage(null);
    setShowManualMedOption(false);
    setScanInitialMode(mode);
    setCurrentScreen('prescription_scan');
  };

  const maxPagesErrorText =
    currentLanguage === 'hi'
      ? `एक बार में अधिकतम ${MAX_SCAN_PAGES} पेज ही अपलोड कर सकते हैं। कृपया ${MAX_SCAN_PAGES} या कम पेज चुनें।`
      : currentLanguage === 'or'
      ? `ଥରକେ ସର୍ବାଧିକ ${MAX_SCAN_PAGES} ପୃଷ୍ଠା ଅପଲୋଡ୍ କରିପାରିବେ। ଦୟାକରି ${MAX_SCAN_PAGES} କିମ୍ବା କମ୍ ପୃଷ୍ଠା ବାଛନ୍ତୁ।`
      : `Maximum ${MAX_SCAN_PAGES} pages allowed per scan. Please choose up to ${MAX_SCAN_PAGES} pages.`;

  const processSelectedFiles = async (
    files: FileList
  ): Promise<{ pages: string[]; exceededLimit: boolean }> => {
    const fileArr = Array.from(files);
    if (fileArr.length > MAX_SCAN_PAGES) {
      return { pages: [], exceededLimit: true };
    }

    const pages: string[] = [];
    let exceededLimit = false;

    for (const file of fileArr) {
      const remaining = MAX_SCAN_PAGES - pages.length;
      if (remaining <= 0) {
        exceededLimit = true;
        break;
      }

      if (isPdfFile(file)) {
        const pdfResult = await renderPdfToJpegPages(file, remaining, 1500, 0.7);
        if (pdfResult.truncated) {
          exceededLimit = true;
          break;
        }
        pages.push(...pdfResult.pages);
      } else {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve((ev.target?.result as string) || '');
          reader.readAsDataURL(file);
        });
        if (dataUrl) {
          const compressed = await compressImage(dataUrl, 1500, 0.7);
          pages.push(compressed);
        }
      }
    }
    return { pages: pages.slice(0, MAX_SCAN_PAGES), exceededLimit };
  };

  const handleDirectGalleryUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'report' | 'medicine'
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!isOnline) {
      setErrorMessage(t.offlineScanNotice);
      e.target.value = '';
      return;
    }
    try {
      const { pages: images, exceededLimit } = await processSelectedFiles(e.target.files);
      e.target.value = '';
      if (exceededLimit) {
        setErrorMessage(maxPagesErrorText);
        return;
      }
      if (images.length === 0) {
        setErrorMessage('Could not open selected file.');
        return;
      }
      if (target === 'report') {
        await handleAnalyzeImages(images);
      } else {
        await handleIdentifyMedicine(images);
      }
    } catch {
      setErrorMessage('Could not read file. Try a clear photo.');
      e.target.value = '';
    }
  };

  const handleStartManualMedicineEntry = () => {
    setErrorMessage(null);
    setShowManualMedOption(false);
    setPendingMedicineImages([]);
    setStep1Result({
      medicine: {
        brand: '',
        salt: null,
        strength: null,
        manufacturer: null,
        batch: null,
        expiry: null,
        expiry_reliable: false,
        mrp: null,
        printed_warnings: [],
        access_level: 'ask_doctor',
        is_expired: false,
      },
      confidence: 'medium',
      unreadable_fields: [],
      is_loose_tablet_only: false,
      image_quality: 'ok',
      risk_flags: [],
      suspicious_flags: [],
    });
    setIsManualConfirmMode(true);
    setCurrentScreen('medicine_confirm');
  };

  const formatNetworkError = (err: unknown, fallbackText: string) => {
    const msg = err instanceof Error ? err.message : String(err || '');
    const lower = msg.toLowerCase();
    // Never show raw technical errors (stack traces, SDK text, HTML, status codes)
    const looksTechnical =
      !msg ||
      msg.length > 180 ||
      lower.includes('error:') ||
      lower.includes('typeerror') ||
      lower.includes('syntaxerror') ||
      lower.includes('failed to fetch') ||
      lower.includes('unexpected token') ||
      lower.includes('503') ||
      lower.includes('500') ||
      lower.includes('unavailable') ||
      lower.includes('timeout') ||
      lower.includes('abort') ||
      lower.includes('json') ||
      msg.includes('<');

    if (looksTechnical) {
      return currentLanguage === 'hi'
        ? 'अभी सेवा व्यस्त है। कृपया "दोबारा प्रयास करें" दबाएं।'
        : currentLanguage === 'or'
        ? 'ସେବା ଏବେ ବ୍ୟସ୍ତ ଅଛି। ଦୟାକରି "ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ" ଚିପନ୍ତୁ।'
        : fallbackText || 'Service is busy right now. Please tap "Try Again".';
    }
    return msg;
  };

  // Report Analysis (Async Upload + 2s Job Polling)
  const handleAnalyzeImages = async (images: string[]) => {
    if (images.length > MAX_SCAN_PAGES) {
      setErrorMessage(maxPagesErrorText);
      return;
    }
    setPendingImages(images);
    setPendingMedIdentifyRetry(null);
    setPendingMedVerifyRetry(null);
    setPendingPrescriptionImages(null);
    setShowManualMedOption(false);
    setProcessingMode('report');
    setScanProgressTitle(undefined);
    setScanProgressSubtitle(undefined);
    setCurrentScreen('home');
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const report = await submitScanJobWithPolling<ReportAnalysis>({
        endpoint: '/api/jobs/scan-report',
        payload: {
          images,
          age: profile.age,
          gender: profile.gender,
          language: currentLanguage,
        },
        language: currentLanguage,
        onProgress: (upd) => {
          setScanProgressTitle(upd.title);
          setScanProgressSubtitle(upd.subtitle);
        },
      });

      if (
        (report.image_quality === 'poor' && (!report.findings || report.findings.length === 0)) ||
        report.is_raw_scan_without_text
      ) {
        setErrorMessage(report.quality_notes || t.retakePhoto);
        return;
      }

      saveReportToStorage(report);
      setPendingImages(null);
      setActiveReport(report);
      setCurrentScreen('dashboard');
    } catch (err: unknown) {
      console.error('Report analysis error:', err);
      setErrorMessage(
        formatNetworkError(
          err,
          currentLanguage === 'hi'
            ? 'रिपोर्ट पढ़ी नहीं जा सकी। कृपया "दोबारा प्रयास करें" दबाएं।'
            : currentLanguage === 'or'
            ? 'ରିପୋର୍ଟ ପଢ଼ିହେଲା ନାହିଁ। ଦୟାକରି "ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ" ଚିପନ୍ତୁ।'
            : 'Could not read the report. Please tap "Try Again".'
        )
      );
    } finally {
      setScanProgressTitle(undefined);
      setScanProgressSubtitle(undefined);
      setIsProcessing(false);
    }
  };

  // MEDICINE STEP 1: IDENTIFY PACK (Async Upload + 2s Job Polling)
  const handleIdentifyMedicine = async (images: string[]) => {
    if (images.length > MAX_SCAN_PAGES) {
      setErrorMessage(maxPagesErrorText);
      return;
    }
    setPendingMedicineImages(images);
    setPendingMedIdentifyRetry(images);
    setPendingImages(null);
    setPendingMedVerifyRetry(null);
    setPendingPrescriptionImages(null);
    setShowManualMedOption(false);
    setProcessingMode('medicine_identify');
    setScanProgressTitle(undefined);
    setScanProgressSubtitle(undefined);
    setCurrentScreen('home');
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const s1 = await submitScanJobWithPolling<MedicineStep1Result>({
        endpoint: '/api/jobs/medicine-identify',
        payload: {
          images,
          language: currentLanguage,
        },
        language: currentLanguage,
        onProgress: (upd) => {
          setScanProgressTitle(upd.title);
          setScanProgressSubtitle(upd.subtitle);
        },
      });

      if (s1.is_loose_tablet_only) {
        setPendingMedIdentifyRetry(null);
        setShowManualMedOption(true);
        setErrorMessage(s1.quality_notes || mt.looseTabletError);
        setIsProcessing(false);
        return;
      }

      if (s1.image_quality === 'poor' && (!s1.medicine?.brand || s1.medicine.brand === 'Unknown')) {
        setPendingMedIdentifyRetry(null);
        setShowManualMedOption(true);
        setErrorMessage(s1.quality_notes || 'Photo not clear. Please retake.');
        setIsProcessing(false);
        return;
      }

      setPendingMedIdentifyRetry(null);
      setStep1Result(s1);
      setIsManualConfirmMode(false);

      // Skip "I have this problem" screen by default.
      // High confidence goes straight to verify + result; Medium/Low asks "Is this correct?"
      if (s1.confidence === 'high') {
        await handleVerifyAndExplainMedicine(s1, '', [], images);
      } else {
        setIsProcessing(false);
        setCurrentScreen('medicine_confirm');
      }
    } catch (err: unknown) {
      console.error('Medicine Step 1 identify error:', err);
      setShowManualMedOption(true);
      setErrorMessage(formatNetworkError(err, 'Could not read medicine pack. Please tap "Try Again".'));
      setIsProcessing(false);
    } finally {
      setScanProgressTitle(undefined);
      setScanProgressSubtitle(undefined);
    }
  };

  // MEDICINE STEP 2 + 3: VERIFY IN OPENFDA & EXPLAIN
  const handleVerifyAndExplainMedicine = async (
    confirmedStep1: MedicineStep1Result,
    problem: string,
    docImages: string[],
    overrideImages?: string[]
  ) => {
    setPendingMedVerifyRetry({ step1: confirmedStep1, problem, docImages });
    setPendingImages(null);
    setPendingMedIdentifyRetry(null);
    setPendingPrescriptionImages(null);
    setShowManualMedOption(false);
    setProcessingMode('medicine_verify');
    setScanProgressTitle(undefined);
    setScanProgressSubtitle(undefined);
    setCurrentScreen('home');
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const hp = getHealthProfile();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const response = await fetch('/api/medicine/verify-and-explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': getClientDeviceId(),
        },
        signal: controller.signal,
        body: JSON.stringify({
          step1: confirmedStep1,
          problem,
          docImages,
          language: currentLanguage,
          age: profile.age,
          gender: profile.gender,
          allergies: hp.allergies,
          conditions: hp.conditions,
          isPregnant: Boolean(hp.is_pregnant_or_breastfeeding),
        }),
      });

      clearTimeout(timeoutId);
      const rawText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error('Service is busy right now. Please tap "Try Again".');
      }

      if (!response.ok || !data.success || !data.medicine) {
        throw new Error(data?.error || 'Could not verify medicine.');
      }

      const thumbs = overrideImages || pendingMedicineImages;
      const med: MedicineAnalysis = {
        ...data.medicine,
        pack_thumbnail: thumbs[0] || undefined,
      };

      setPendingMedVerifyRetry(null);
      setActiveMedicine(med);
      setMedicineReturnScreen('home');
      setCurrentScreen('medicine_result');
    } catch (err: unknown) {
      console.error('Medicine Step 2+3 error:', err);
      setErrorMessage(formatNetworkError(err, 'Could not verify medicine. Please tap "Try Again".'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Prescription Draft Extraction (Async Upload + 2s Job Polling)
  const handleAnalyzePrescription = async (images: string[]) => {
    if (images.length > MAX_SCAN_PAGES) {
      setErrorMessage(maxPagesErrorText);
      return;
    }
    setPendingPrescriptionImages(images);
    setPendingImages(null);
    setPendingMedIdentifyRetry(null);
    setPendingMedVerifyRetry(null);
    setShowManualMedOption(false);
    setProcessingMode('prescription');
    setScanProgressTitle(undefined);
    setScanProgressSubtitle(undefined);
    setCurrentScreen('home');
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const draft = await submitScanJobWithPolling<{
        doctor_name?: string | null;
        date?: string | null;
        image_quality?: string;
        quality_notes?: string;
        lines: PrescriptionLineItem[];
      }>({
        endpoint: '/api/jobs/prescription-read',
        payload: {
          images,
          language: currentLanguage,
        },
        language: currentLanguage,
        onProgress: (upd) => {
          setScanProgressTitle(upd.title);
          setScanProgressSubtitle(upd.subtitle);
        },
      });

      if (draft.image_quality === 'poor' && (!draft.lines || draft.lines.length === 0)) {
        setPendingPrescriptionImages(null);
        setErrorMessage(draft.quality_notes || 'Photo not clear. Please retake.');
        return;
      }

      setPendingPrescriptionImages(null);
      setPrescriptionDraft(draft);
      setCurrentScreen('prescription_verify');
    } catch (err: unknown) {
      console.error('Prescription analysis error:', err);
      setErrorMessage(formatNetworkError(err, 'Could not read prescription. Please tap "Try Again".'));
    } finally {
      setScanProgressTitle(undefined);
      setScanProgressSubtitle(undefined);
      setIsProcessing(false);
    }
  };

  // Prescription Confirm -> Incremental 3-Step Explain per line
  const handleExplainPrescription = async (payload: {
    lines: PrescriptionLineItem[];
    doctor_name: string;
    date: string;
    userProblem: string;
    report: ReportAnalysis | null;
  }) => {
    setProcessingMode('prescription');
    setPrescriptionProgressText('');
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const hp = getHealthProfile();
      const rxId = 'rx-' + Date.now();
      const nowIso = new Date().toISOString();

      if (payload.lines.length <= 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);
        const response = await fetch('/api/explain-prescription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Id': getClientDeviceId(),
          },
          signal: controller.signal,
          body: JSON.stringify({
            ...payload,
            language: currentLanguage,
            age: profile.age,
            gender: profile.gender,
            allergies: hp.allergies,
            conditions: hp.conditions,
            isPregnant: Boolean(hp.is_pregnant_or_breastfeeding),
          }),
        });
        clearTimeout(timeoutId);
        const rawText = await response.text();
        let data: any = null;
        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error('The reading service took too long to respond. Please try again.');
        }
        if (!response.ok || !data.success || !data.prescription) {
          throw new Error(data?.error || 'Could not explain prescription.');
        }
        setActivePrescription(data.prescription);
        setCurrentScreen('prescription_results');
        return;
      }

      const explainedMeds: MedicineAnalysis[] = [];
      for (let i = 0; i < payload.lines.length; i++) {
        const line = payload.lines[i];
        setPrescriptionProgressText(`${i + 1} / ${payload.lines.length}: ${line.name}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 75000);
        const lineRes = await fetch('/api/explain-prescription-line', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Id': getClientDeviceId(),
          },
          signal: controller.signal,
          body: JSON.stringify({
            line,
            userProblem: payload.userProblem,
            language: currentLanguage,
            age: profile.age,
            gender: profile.gender,
            allergies: hp.allergies,
            conditions: hp.conditions,
            isPregnant: Boolean(hp.is_pregnant_or_breastfeeding),
            doctor_name: payload.doctor_name,
            rxId,
            reportId: payload.report?.id,
          }),
        });
        clearTimeout(timeoutId);
        const lineRaw = await lineRes.text();
        let lineData: any = null;
        try {
          lineData = JSON.parse(lineRaw);
        } catch {
          throw new Error('Could not check this medicine right now. Please try again.');
        }
        if (!lineRes.ok || !lineData.success || !lineData.medicine) {
          throw new Error(lineData?.error || 'Could not check this medicine right now.');
        }
        explainedMeds.push(lineData.medicine);
      }

      let whySummary: any = undefined;
      try {
        const sumRes = await fetch('/api/explain-prescription-summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Id': getClientDeviceId(),
          },
          body: JSON.stringify({
            medicines: explainedMeds,
            userProblem: payload.userProblem,
            report: payload.report,
            language: currentLanguage,
          }),
        });
        const sumData = JSON.parse(await sumRes.text());
        if (sumRes.ok && sumData.success) {
          whySummary = sumData.why_this_prescription;
        }
      } catch {
        // Optional summary fails gracefully
      }

      const rxRecord: PrescriptionRecord = {
        id: rxId,
        created_at: nowIso,
        doctor_name: payload.doctor_name || undefined,
        date: payload.date || undefined,
        lines: payload.lines,
        medicines: explainedMeds,
        why_this_prescription: whySummary,
        linked_report_id: payload.report?.id || undefined,
        user_problem: payload.userProblem || undefined,
        image_quality: 'ok',
      };

      setActivePrescription(rxRecord);
      setCurrentScreen('prescription_results');
    } catch (err: unknown) {
      console.error('Explain prescription error:', err);
      setErrorMessage(formatNetworkError(err, 'Could not explain prescription.'));
    } finally {
      setPrescriptionProgressText('');
      setIsProcessing(false);
    }
  };

  const handleSelectDemoReport = (demo: ReportAnalysis) => {
    setShowDemoSelector(false);
    saveReportToStorage(demo);
    setActiveReport(demo);
    setCurrentScreen('dashboard');
  };

  const handleSelectDemoMedicine = (demo: MedicineAnalysis) => {
    setShowDemoMedicineSelector(false);
    setActiveMedicine(demo);
    setMedicineReturnScreen('home');
    setCurrentScreen('medicine_result');
  };

  const hasRetryAction =
    Boolean(pendingImages && pendingImages.length > 0) ||
    Boolean(pendingMedIdentifyRetry && pendingMedIdentifyRetry.length > 0) ||
    Boolean(pendingMedVerifyRetry) ||
    Boolean(pendingPrescriptionImages && pendingPrescriptionImages.length > 0);

  const handleRetry = () => {
    if (pendingImages && pendingImages.length > 0) {
      handleAnalyzeImages(pendingImages);
    } else if (pendingMedIdentifyRetry && pendingMedIdentifyRetry.length > 0) {
      handleIdentifyMedicine(pendingMedIdentifyRetry);
    } else if (pendingMedVerifyRetry) {
      handleVerifyAndExplainMedicine(
        pendingMedVerifyRetry.step1,
        pendingMedVerifyRetry.problem,
        pendingMedVerifyRetry.docImages
      );
    } else if (pendingPrescriptionImages && pendingPrescriptionImages.length > 0) {
      handleAnalyzePrescription(pendingPrescriptionImages);
    }
  };

  const scanReportLabel =
    currentLanguage === 'hi'
      ? 'रिपोर्ट स्कैन करें'
      : currentLanguage === 'or'
      ? 'ରିପୋର୍ଟ ସ୍କାନ୍ କରନ୍ତୁ'
      : 'Scan Report';

  const scanMedicineLabel =
    currentLanguage === 'hi'
      ? 'दवा स्कैन करें'
      : currentLanguage === 'or'
      ? 'ଔଷଧ ସ୍କାନ୍ କରନ୍ତୁ'
      : 'Scan Medicine';

  const uploadLinkLabel =
    currentLanguage === 'hi'
      ? 'गैलरी या PDF चुनें'
      : currentLanguage === 'or'
      ? 'ଗ୍ୟାଲେରୀ ବା PDF ବାଛନ୍ତୁ'
      : 'Upload photo or PDF';

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col justify-between selection:bg-[var(--color-brand-soft)]">
      {/* Disclaimer on first launch */}
      {!profile.disclaimerAccepted && (
        <DisclaimerModal
          initialLanguage={currentLanguage}
          onComplete={handleProfileComplete}
        />
      )}

      {/* Offline banner notification (neutral dark slate, never health-status color) */}
      {!isOnline && (
        <div className="bg-[var(--color-text)] text-white px-4 py-2.5 text-base font-bold flex items-center justify-center gap-2">
          <WifiOff className="w-5 h-5 shrink-0" />
          <span>{t.offlineTitle}</span>
        </div>
      )}

      {/* Minimal Header: App Title + History Icon + Settings Icon */}
      <header className="sticky top-0 z-30 bg-[var(--color-bg)]/95 backdrop-blur-xs px-4 py-3.5 print:hidden">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentScreen('home')}
            className="flex items-center gap-3 text-left min-h-[44px]"
          >
            <div className="w-10 h-10 rounded-[12px] bg-[var(--color-brand)] text-white flex items-center justify-center shadow-[var(--shadow-card)]">
              <HeartPulse className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-[var(--color-text)] text-xl tracking-tight">
              {t.appName}
            </span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setHistoryTab('reports');
                setCurrentScreen('history');
              }}
              aria-label="History"
              title="History"
              className="w-11 h-11 rounded-[14px] bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-card)] flex items-center justify-center hover:bg-[var(--color-surface-subtle)] transition"
            >
              <History className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              aria-label="Settings"
              title="Settings"
              className="w-11 h-11 rounded-[14px] bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-card)] flex items-center justify-center hover:bg-[var(--color-surface-subtle)] transition"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Body Views */}
      <main className="flex-1 flex flex-col">
        {/* Error alert */}
        {errorMessage && (
          <div className="max-w-xl w-full mx-auto px-4 mt-4">
            <div className="rounded-[16px] bg-[var(--color-danger-soft)] shadow-[var(--shadow-card)] p-5 flex items-start gap-3.5">
              <AlertCircle className="w-6 h-6 text-[var(--color-danger)] shrink-0 mt-0.5" />
              <div className="flex-1 space-y-3">
                <p className="text-base text-[var(--color-danger)] font-bold leading-snug">
                  {errorMessage}
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  {hasRetryAction && (
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="rs-btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-base font-bold"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>
                        {currentLanguage === 'hi'
                          ? 'दोबारा प्रयास करें'
                          : currentLanguage === 'or'
                          ? 'ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ'
                          : 'Try Again'}
                      </span>
                    </button>
                  )}
                  {showManualMedOption && (
                    <button
                      type="button"
                      onClick={handleStartManualMedicineEntry}
                      className="inline-flex items-center gap-2 rounded-[16px] bg-[var(--color-surface)] text-[var(--color-brand)] shadow-[var(--shadow-card)] px-4 py-2.5 text-base font-bold hover:bg-[var(--color-brand-soft)] transition"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>{mt.manualEntryBtn}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setShowManualMedOption(false);
                      setPendingImages(null);
                      setPendingMedIdentifyRetry(null);
                      setPendingMedVerifyRetry(null);
                      setPendingPrescriptionImages(null);
                    }}
                    className="text-base font-bold text-[var(--color-text-secondary)] px-3 py-2"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROCESSING SCREEN */}
        {isProcessing && (
          <ProcessingScreen
            language={currentLanguage}
            customTitle={
              scanProgressTitle ||
              (processingMode === 'medicine_identify'
                ? mt.identifyingStep
                : processingMode === 'medicine_verify'
                ? mt.verifyingStep
                : processingMode === 'prescription'
                ? mt.readingPrescription
                : undefined)
            }
            customSubtitle={scanProgressSubtitle || prescriptionProgressText || undefined}
          />
        )}

        {/* HOME SCREEN: ONE SMALL FRIENDLY FLAT ILLUSTRATION + 2 BIG BUTTONS + SMALL GALLERY LINKS */}
        {currentScreen === 'home' && !isProcessing && (
          <div className="flex-1 max-w-md w-full mx-auto px-6 py-8 flex flex-col justify-center gap-7">
            {/* One small friendly flat illustration (home screen only, no gradients) */}
            <div className="flex justify-center" aria-hidden="true">
              <svg
                viewBox="0 0 220 120"
                className="w-44 h-auto"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="20" y="14" width="180" height="92" rx="24" fill="#E6F3F2" />
                {/* Report sheet */}
                <rect x="48" y="24" width="68" height="80" rx="12" fill="#FFFFFF" />
                <rect x="60" y="38" width="28" height="6" rx="3" fill="#0F766E" />
                <rect x="60" y="52" width="44" height="5" rx="2.5" fill="#DCEBEB" />
                <rect x="60" y="64" width="38" height="5" rx="2.5" fill="#DCEBEB" />
                <rect x="60" y="76" width="44" height="5" rx="2.5" fill="#DCEBEB" />
                {/* Medicine pack */}
                <rect x="122" y="40" width="50" height="60" rx="12" fill="#0F766E" />
                <rect x="134" y="54" width="26" height="10" rx="5" fill="#FFFFFF" />
                <circle cx="139" cy="78" r="5" fill="#FFFFFF" />
                <circle cx="155" cy="78" r="5" fill="#FFFFFF" />
                <circle cx="139" cy="91" r="5" fill="#FFFFFF" />
                <circle cx="155" cy="91" r="5" fill="#FFFFFF" />
              </svg>
            </div>

            {/* Button 1: Scan Report */}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleOpenScanner}
                className="rs-btn-primary w-full py-6 px-6 shadow-[var(--shadow-card)] flex items-center justify-center gap-4"
              >
                <Camera className="w-8 h-8 shrink-0" />
                <span className="text-xl font-extrabold tracking-tight">{scanReportLabel}</span>
              </button>

              <button
                type="button"
                onClick={() => reportFileRef.current?.click()}
                className="inline-flex items-center gap-2 text-base font-bold text-[var(--color-brand)] hover:underline py-1.5 px-3"
              >
                <Upload className="w-4 h-4" />
                <span>{uploadLinkLabel}</span>
              </button>
            </div>

            {/* Button 2: Scan Medicine */}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenMedicineScanner('camera')}
                className="rs-card w-full py-6 px-6 text-[var(--color-text)] hover:bg-[var(--color-brand-soft)] active:scale-[0.99] transition flex items-center justify-center gap-4"
              >
                <span className="w-11 h-11 rounded-[12px] bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center shrink-0">
                  <Camera className="w-7 h-7" />
                </span>
                <span className="text-xl font-extrabold tracking-tight">{scanMedicineLabel}</span>
              </button>

              <button
                type="button"
                onClick={() => medicineFileRef.current?.click()}
                className="inline-flex items-center gap-2 text-base font-bold text-[var(--color-brand)] hover:underline py-1.5 px-3"
              >
                <Upload className="w-4 h-4" />
                <span>{uploadLinkLabel}</span>
              </button>
            </div>

            {/* Hidden File Inputs for direct Gallery / PDF upload */}
            <input
              ref={reportFileRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => handleDirectGalleryUpload(e, 'report')}
            />
            <input
              ref={medicineFileRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => handleDirectGalleryUpload(e, 'medicine')}
            />
          </div>
        )}

        {/* REPORT SCAN SCREEN */}
        {currentScreen === 'scan' && (
          <CameraScanner
            language={currentLanguage}
            initialMode={scanInitialMode}
            onAnalyze={handleAnalyzeImages}
            onCancel={() => setCurrentScreen('home')}
          />
        )}

        {/* MEDICINE SCAN SCREEN */}
        {currentScreen === 'medicine_scan' && (
          <CameraScanner
            language={currentLanguage}
            initialMode={scanInitialMode}
            onAnalyze={handleIdentifyMedicine}
            onCancel={() => setCurrentScreen('home')}
          />
        )}

        {/* MEDICINE CONFIRMATION (Only shown when Medium/Low confidence or manual entry) */}
        {currentScreen === 'medicine_confirm' && step1Result && (
          <MedicineConfirmScreen
            language={currentLanguage}
            step1Result={step1Result}
            packThumbnail={pendingMedicineImages[0]}
            isManualMode={isManualConfirmMode}
            onConfirm={(confirmed) =>
              handleVerifyAndExplainMedicine(confirmed, '', [], pendingMedicineImages)
            }
            onRetake={() => {
              if (isManualConfirmMode) {
                setCurrentScreen('home');
              } else {
                setCurrentScreen('medicine_scan');
              }
            }}
          />
        )}

        {/* MEDICINE RESULT SCREEN */}
        {currentScreen === 'medicine_result' && activeMedicine && (
          <MedicineResultScreen
            medicine={activeMedicine}
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
            onMedicineUpdated={(updated) => setActiveMedicine(updated)}
            onBack={() => setCurrentScreen(medicineReturnScreen)}
            onRequestScanReport={() => {
              setScanInitialMode('camera');
              setCurrentScreen('scan');
            }}
          />
        )}

        {/* COMBINED HISTORY SCREEN (Reports | Medicines tabs) */}
        {currentScreen === 'history' && (
          <HistoryScreen
            language={currentLanguage}
            initialTab={historyTab}
            onSelectReport={(rep) => {
              setActiveReport(rep);
              setCurrentScreen('dashboard');
            }}
            onSelectMedicine={(med) => {
              setActiveMedicine(med);
              setMedicineReturnScreen('history');
              setCurrentScreen('medicine_result');
            }}
            onBackToHome={() => setCurrentScreen('home')}
          />
        )}

        {/* REPORT DASHBOARD */}
        {currentScreen === 'dashboard' && activeReport && (
          <Dashboard
            report={activeReport}
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
            onReportUpdated={(updated) => setActiveReport(updated)}
            onBackToHome={() => setCurrentScreen('home')}
          />
        )}

        {/* PRESCRIPTION FLOW */}
        {currentScreen === 'prescription_scan' && (
          <CameraScanner
            language={currentLanguage}
            initialMode={scanInitialMode}
            onAnalyze={handleAnalyzePrescription}
            onCancel={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'prescription_verify' && prescriptionDraft && (
          <PrescriptionVerifyScreen
            language={currentLanguage}
            draft={prescriptionDraft}
            onConfirm={handleExplainPrescription}
            onBack={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'prescription_results' && activePrescription && (
          <PrescriptionResultsScreen
            language={currentLanguage}
            prescription={activePrescription}
            onSelectMedicine={(med) => {
              setActiveMedicine(med);
              setMedicineReturnScreen('prescription_results');
              setCurrentScreen('medicine_result');
            }}
            onBack={() => setCurrentScreen('home')}
          />
        )}
      </main>

      {/* Subtle Footer */}
      <footer className="py-4 px-4 text-center print:hidden">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          {t.builtByAsmit}
        </p>
      </footer>

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          language={currentLanguage}
          profile={profile}
          healthProfile={getHealthProfile()}
          onLanguageChange={handleLanguageChange}
          onOpenHealthProfile={() => setShowProfileModal(true)}
          onOpenPrescriptionScan={() => handleOpenPrescriptionScanner('camera')}
          onOpenDemoReport={() => setShowDemoSelector(true)}
          onOpenDemoMedicine={() => setShowDemoMedicineSelector(true)}
          onDataReset={() => {
            setProfile(getStoredProfile());
            setCurrentScreen('home');
          }}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Health Profile Modal */}
      {showProfileModal && (
        <HealthProfileModal
          language={currentLanguage}
          profile={profile}
          healthProfile={getHealthProfile()}
          onSave={(nextProfile, nextHp) => {
            setProfile(nextProfile);
            saveStoredProfile(nextProfile);
            saveHealthProfile(nextHp);
            setShowProfileModal(false);
          }}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* Demo Report Selection Modal */}
      {showDemoSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-text)]/50 p-4">
          <div className="rs-card w-full max-w-sm p-6 space-y-4">
            <h3 className="text-xl font-extrabold text-[var(--color-text)]">
              Select a Demo Report
            </h3>
            <div className="space-y-2.5">
              {demoReports.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => handleSelectDemoReport(demo)}
                  className="w-full text-left rounded-[14px] bg-[var(--color-bg)] px-4 py-3.5 hover:bg-[var(--color-brand-soft)] flex items-center justify-between transition"
                >
                  <span className="font-bold text-base text-[var(--color-text)]">
                    {demo.report_type}
                  </span>
                  <span className="text-base font-bold text-[var(--color-brand)]">Open</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowDemoSelector(false)}
              className="w-full rounded-[14px] bg-[var(--color-surface-subtle)] py-3 text-base font-bold text-[var(--color-text)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Demo Medicine Selection Modal */}
      {showDemoMedicineSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-text)]/50 p-4">
          <div className="rs-card w-full max-w-sm p-6 space-y-4">
            <h3 className="text-xl font-extrabold text-[var(--color-text)]">
              Select a Demo Medicine
            </h3>
            <div className="space-y-2.5">
              {demoMedicines.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => handleSelectDemoMedicine(demo)}
                  className="w-full text-left rounded-[14px] bg-[var(--color-bg)] px-4 py-3.5 hover:bg-[var(--color-brand-soft)] flex items-center justify-between transition"
                >
                  <span className="font-bold text-base text-[var(--color-text)]">
                    {demo.medicine.brand}
                  </span>
                  <span className="text-base font-bold text-[var(--color-brand)]">Open</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowDemoMedicineSelector(false)}
              className="w-full rounded-[14px] bg-[var(--color-surface-subtle)] py-3 text-base font-bold text-[var(--color-text)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
