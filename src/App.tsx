import React, { useState } from 'react';
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
  getStoredReports,
  saveReportToStorage,
  getStoredMedicines,
  getHealthProfile,
  saveHealthProfile,
} from './utils/storage';
import { demoReports } from './utils/demoData';
import { demoMedicines } from './utils/demoMedicineData';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { DisclaimerModal } from './components/DisclaimerModal';
import { CameraScanner } from './components/CameraScanner';
import { ProcessingScreen } from './components/ProcessingScreen';
import { Dashboard } from './components/Dashboard';
import { PastReports } from './components/PastReports';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ProblemContextScreen } from './components/ProblemContextScreen';
import { MedicineResultScreen } from './components/MedicineResultScreen';
import {
  PrescriptionVerifyScreen,
  PrescriptionResultsScreen,
} from './components/PrescriptionScannerFlow';
import { MyMedicines } from './components/MyMedicines';
import { MedicineConfirmScreen } from './components/medicine/MedicineConfirmScreen';
import { HealthProfileModal } from './components/HealthProfileModal';
import {
  Camera,
  Image as ImageIcon,
  History,
  FileText,
  WifiOff,
  AlertCircle,
  ShieldCheck,
  HeartPulse,
  Languages,
  RefreshCw,
  Pill,
  ClipboardList,
  FolderHeart,
  ChevronRight,
  Edit3,
  Home,
  User,
  X,
} from 'lucide-react';

type ScreenName =
  | 'home'
  | 'scan'
  | 'dashboard'
  | 'past_reports'
  | 'medicine_scan'
  | 'medicine_confirm'
  | 'medicine_problem'
  | 'medicine_result'
  | 'prescription_scan'
  | 'prescription_verify'
  | 'prescription_results'
  | 'my_medicines';

export default function App() {
  const [profile, setProfile] = useState<UserProfile>(getStoredProfile());
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('home');
  const [scanInitialMode, setScanInitialMode] = useState<'camera' | 'gallery'>('camera');
  const [activeReport, setActiveReport] = useState<ReportAnalysis | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingMode, setProcessingMode] = useState<
    'report' | 'medicine_identify' | 'medicine_verify' | 'prescription'
  >('report');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showManualMedOption, setShowManualMedOption] = useState<boolean>(false);
  const [showDemoSelector, setShowDemoSelector] = useState<boolean>(false);
  const [showDemoMedicineSelector, setShowDemoMedicineSelector] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [scanChoiceTarget, setScanChoiceTarget] = useState<
    'report' | 'medicine' | 'prescription' | null
  >(null);
  const [prescriptionProgressText, setPrescriptionProgressText] = useState<string>('');

  // Medicine 3-step pipeline states
  const [pendingMedicineImages, setPendingMedicineImages] = useState<string[]>([]);
  const [step1Result, setStep1Result] = useState<MedicineStep1Result | null>(null);
  const [isManualConfirmMode, setIsManualConfirmMode] = useState<boolean>(false);
  const [activeMedicine, setActiveMedicine] = useState<MedicineAnalysis | null>(null);
  const [medicineReturnScreen, setMedicineReturnScreen] = useState<
    'home' | 'my_medicines' | 'prescription_results'
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
    if (!isOnline) {
      setErrorMessage(t.offlineScanNotice);
      return;
    }
    setErrorMessage(null);
    setShowManualMedOption(false);
    setScanInitialMode('camera');
    setCurrentScreen('scan');
  };

  const handleOpenGallery = () => {
    if (!isOnline) {
      setErrorMessage(t.offlineScanNotice);
      return;
    }
    setErrorMessage(null);
    setShowManualMedOption(false);
    setScanInitialMode('gallery');
    setCurrentScreen('scan');
  };

  const handleOpenMedicineScanner = (mode: 'camera' | 'gallery' = 'camera') => {
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
    if (!isOnline) {
      setErrorMessage(t.offlineScanNotice);
      return;
    }
    setErrorMessage(null);
    setShowManualMedOption(false);
    setScanInitialMode(mode);
    setCurrentScreen('prescription_scan');
  };

  const handleOpenScanChoice = (target: 'report' | 'medicine' | 'prescription') => {
    if (!isOnline) {
      setErrorMessage(t.offlineScanNotice);
      return;
    }
    setScanChoiceTarget(target);
  };

  const handleLaunchChosenScan = (mode: 'camera' | 'gallery') => {
    const target = scanChoiceTarget;
    setScanChoiceTarget(null);
    if (target === 'report') {
      if (mode === 'camera') handleOpenScanner();
      else handleOpenGallery();
    } else if (target === 'medicine') {
      handleOpenMedicineScanner(mode);
    } else if (target === 'prescription') {
      handleOpenPrescriptionScanner(mode);
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

  const [pendingImages, setPendingImages] = useState<string[] | null>(null);

  const formatNetworkError = (err: unknown, fallbackText: string) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes('503') ||
      msg.includes('high demand') ||
      msg.includes('UNAVAILABLE') ||
      msg.includes('Timeout') ||
      msg.includes('abort') ||
      msg.includes('JSON') ||
      msg.includes('<')
    ) {
      return currentLanguage === 'hi'
        ? 'एआई सेवा पर अभी बहुत अधिक लोड है। कृपया नीचे "दोबारा प्रयास करें" दबाएं।'
        : currentLanguage === 'or'
        ? 'ଏଆଇ ସେବାରେ ଅତ୍ୟଧିକ ଚାପ ରହିଛି। ଦୟାକରି "ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ" ଚିପନ୍ତୁ।'
        : 'The AI reading service is currently experiencing high demand. Please tap "Try Again" below.';
    }
    return msg || fallbackText;
  };

  // Report Analysis
  const handleAnalyzeImages = async (images: string[]) => {
    setPendingImages(images);
    setPendingMedIdentifyRetry(null);
    setPendingMedVerifyRetry(null);
    setPendingPrescriptionImages(null);
    setShowManualMedOption(false);
    setProcessingMode('report');
    setCurrentScreen('home');
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 75000);

      const response = await fetch('/api/analyze-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          images,
          age: profile.age,
          gender: profile.gender,
          language: currentLanguage,
        }),
      });

      clearTimeout(timeoutId);
      const rawText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error('The reading service took too long to respond. Please tap "Try Again".');
      }

      if (!response.ok || !data.success || !data.report) {
        throw new Error(data?.error || 'Unable to analyze the report image.');
      }

      const report: ReportAnalysis = data.report;

      if (
        (report.image_quality === 'poor' && (!report.findings || report.findings.length === 0)) ||
        report.is_raw_scan_without_text
      ) {
        setErrorMessage(
          report.quality_notes ||
            'The photo was not clear or appears to be a raw scan image without written report text. Please retake or upload the doctor’s printed report.'
        );
        setIsProcessing(false);
        return;
      }

      saveReportToStorage(report);
      setPendingImages(null);
      setActiveReport(report);
      setCurrentScreen('dashboard');
    } catch (err: unknown) {
      console.error('Report analysis error:', err);
      setErrorMessage(formatNetworkError(err, 'Unable to analyze the report.'));
    } finally {
      setIsProcessing(false);
    }
  };

  // MEDICINE STEP 1: IDENTIFY PACK
  const handleIdentifyMedicine = async (images: string[]) => {
    setPendingMedicineImages(images);
    setPendingMedIdentifyRetry(images);
    setPendingImages(null);
    setPendingMedVerifyRetry(null);
    setPendingPrescriptionImages(null);
    setShowManualMedOption(false);
    setProcessingMode('medicine_identify');
    setCurrentScreen('home');
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 75000);

      const response = await fetch('/api/medicine/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          images,
          language: currentLanguage,
        }),
      });

      clearTimeout(timeoutId);
      const rawText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error('The reading service took too long to respond. Please tap "Try Again".');
      }

      if (!response.ok || !data.success || !data.step1) {
        throw new Error(data?.error || 'Could not identify medicine pack.');
      }

      const s1: MedicineStep1Result = data.step1;

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

      // If confidence is not High or salt is missing, show "Is this your medicine?" confirmation/edit screen
      if (s1.confidence !== 'high' || !s1.medicine.salt) {
        setCurrentScreen('medicine_confirm');
      } else {
        setCurrentScreen('medicine_problem');
      }
    } catch (err: unknown) {
      console.error('Medicine Step 1 identify error:', err);
      setShowManualMedOption(true);
      setErrorMessage(formatNetworkError(err, 'Could not read medicine pack.'));
    } finally {
      setIsProcessing(false);
    }
  };

  // MEDICINE STEP 2 + 3: VERIFY IN OPENFDA & EXPLAIN
  const handleVerifyAndExplainMedicine = async (
    confirmedStep1: MedicineStep1Result,
    problem: string,
    docImages: string[]
  ) => {
    setPendingMedVerifyRetry({ step1: confirmedStep1, problem, docImages });
    setPendingImages(null);
    setPendingMedIdentifyRetry(null);
    setPendingPrescriptionImages(null);
    setShowManualMedOption(false);
    setProcessingMode('medicine_verify');
    setCurrentScreen('home');
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const hp = getHealthProfile();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 75000);

      const response = await fetch('/api/medicine/verify-and-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        throw new Error('The verification service took too long. Please tap "Try Again".');
      }

      if (!response.ok || !data.success || !data.medicine) {
        throw new Error(data?.error || 'Could not verify medicine.');
      }

      const med: MedicineAnalysis = {
        ...data.medicine,
        pack_thumbnail: pendingMedicineImages[0] || undefined,
      };

      setPendingMedVerifyRetry(null);
      setActiveMedicine(med);
      setMedicineReturnScreen('home');
      setCurrentScreen('medicine_result');
    } catch (err: unknown) {
      console.error('Medicine Step 2+3 error:', err);
      setErrorMessage(formatNetworkError(err, 'Could not verify medicine.'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Prescription Draft Extraction
  const handleAnalyzePrescription = async (images: string[]) => {
    setPendingPrescriptionImages(images);
    setPendingImages(null);
    setPendingMedIdentifyRetry(null);
    setPendingMedVerifyRetry(null);
    setShowManualMedOption(false);
    setProcessingMode('prescription');
    setCurrentScreen('home');
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 75000);

      const response = await fetch('/api/analyze-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          images,
          language: currentLanguage,
        }),
      });

      clearTimeout(timeoutId);
      const rawText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error('The reading service took too long to respond. Please tap "Try Again".');
      }

      if (!response.ok || !data.success || !data.prescriptionDraft) {
        throw new Error(data?.error || 'Could not read prescription.');
      }

      const draft = data.prescriptionDraft;
      if (draft.image_quality === 'poor' && (!draft.lines || draft.lines.length === 0)) {
        setPendingPrescriptionImages(null);
        setErrorMessage(draft.quality_notes || 'Photo not clear. Please retake.');
        setIsProcessing(false);
        return;
      }

      setPendingPrescriptionImages(null);
      setPrescriptionDraft(draft);
      setCurrentScreen('prescription_verify');
    } catch (err: unknown) {
      console.error('Prescription analysis error:', err);
      setErrorMessage(formatNetworkError(err, 'Could not read prescription.'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Prescription Confirm -> Incremental 3-Step Explain per line (never times out on long prescriptions)
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

      // For 1 line, single call is already fast; for 2+ lines, process incrementally with progress
      if (payload.lines.length <= 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 75000);
        const response = await fetch('/api/explain-prescription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        setPrescriptionProgressText(
          currentLanguage === 'hi'
            ? `दवा ${i + 1} / ${payload.lines.length}: ${line.name}`
            : currentLanguage === 'or'
            ? `ଔଷଧ ${i + 1} / ${payload.lines.length}: ${line.name}`
            : `Checking medicine ${i + 1} of ${payload.lines.length}: ${line.name}`
        );

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        const lineRes = await fetch('/api/explain-prescription-line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
          throw new Error(`Timed out checking ${line.name}. Please try again.`);
        }
        if (!lineRes.ok || !lineData.success || !lineData.medicine) {
          throw new Error(lineData?.error || `Could not check ${line.name}.`);
        }
        explainedMeds.push(lineData.medicine);
      }

      setPrescriptionProgressText(
        currentLanguage === 'hi'
          ? 'सभी दवाओं का सारांश बन रहा है...'
          : currentLanguage === 'or'
          ? 'ସମସ୍ତ ଔଷଧର ସାରାଂଶ ପ୍ରସ୍ତୁତ ହେଉଛି...'
          : 'Building combined prescription summary...'
      );

      let whySummary: any = undefined;
      try {
        const sumRes = await fetch('/api/explain-prescription-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        // Optional combined summary fails gracefully without losing verified per-medicine results
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
    // View demo clearly labeled with is_demo: true without overwriting real scan behavior
    setActiveMedicine(demo);
    setMedicineReturnScreen('home');
    setCurrentScreen('medicine_result');
  };

  const savedReports = getStoredReports();
  const savedMedicines = getStoredMedicines();

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-teal-200">
      {/* Disclaimer on first launch */}
      {!profile.disclaimerAccepted && (
        <DisclaimerModal
          initialLanguage={currentLanguage}
          onComplete={handleProfileComplete}
        />
      )}

      {/* Offline banner notification */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-xs">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>{t.offlineTitle} — {t.offlineDesc}</span>
        </div>
      )}

      {/* Main Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentScreen('home')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-slate-900 text-base leading-none block">
                {t.appName}
              </span>
              <span className="text-[10px] text-teal-700 font-bold tracking-tight">
                Simple Medical Report & Medicine
              </span>
            </div>
          </button>

          <div className="flex items-center gap-1.5">
            <PWAInstallButton language={currentLanguage} />
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95"
              title="My Health Profile"
            >
              <User className="w-3.5 h-3.5 text-teal-700" />
              <span className="hidden sm:inline">
                {profile.age ? `${profile.age}y` : 'Profile'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                const nextLang: SupportedLanguage =
                  currentLanguage === 'en' ? 'hi' : currentLanguage === 'hi' ? 'or' : 'en';
                handleLanguageChange(nextLang);
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95"
              title="Change Language"
            >
              <Languages className="w-3.5 h-3.5 text-teal-700" />
              <span>
                {currentLanguage === 'en'
                  ? 'English'
                  : currentLanguage === 'hi'
                  ? 'हिन्दी'
                  : 'ଓଡ଼ିଆ'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Body Views */}
      <main className="flex-1">
        {/* Error notification alert */}
        {errorMessage && (
          <div className="max-w-xl mx-auto px-4 mt-4">
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 shadow-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-bold text-rose-900">
                  {currentLanguage === 'hi' ? 'सूचना' : currentLanguage === 'or' ? 'ସୂଚନା' : 'Notice'}
                </h4>
                <p className="text-xs text-rose-700 font-medium mt-1 leading-relaxed">
                  {errorMessage}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {hasRetryAction && (
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
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
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-800 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
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
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg"
                  >
                    {currentLanguage === 'hi' ? 'हटाएं' : currentLanguage === 'or' ? 'ବନ୍ଦ କରନ୍ତୁ' : 'Dismiss'}
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
              processingMode === 'medicine_identify'
                ? mt.identifyingStep
                : processingMode === 'medicine_verify'
                ? mt.verifyingStep
                : processingMode === 'prescription'
                ? mt.readingPrescription
                : undefined
            }
            customSubtitle={prescriptionProgressText || undefined}
          />
        )}

        {/* HOME SCREEN (Simplified 3-Card Layout + Native Language Pills) */}
        {currentScreen === 'home' && !isProcessing && (
          <div className="max-w-xl mx-auto px-4 pt-5 pb-24 flex flex-col items-center text-center">
            {/* Clear Native-Script Language Bar */}
            <div className="inline-flex items-center gap-1 rounded-2xl bg-white p-1 border border-slate-200 shadow-xs mb-4">
              {(
                [
                  { code: 'en', label: 'English' },
                  { code: 'hi', label: 'हिन्दी' },
                  { code: 'or', label: 'ଓଡ଼ିଆ' },
                ] as const
              ).map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleLanguageChange(item.code)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition ${
                    currentLanguage === item.code
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mb-5">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                {t.tagline}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-sm mx-auto font-medium">
                {mt.scanMedicineHint}
              </p>
            </div>

            {/* 3 Clear Primary Visual Cards */}
            <div className="w-full max-w-sm space-y-3 text-left">
              <button
                type="button"
                onClick={() => handleOpenScanChoice('report')}
                className="w-full rounded-3xl bg-teal-700 text-white p-4 shadow-md shadow-teal-700/20 hover:bg-teal-800 transition active:scale-98 flex items-center gap-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                  <Camera className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-base font-black block leading-tight">
                    {t.scanCameraBtn}
                  </span>
                  <span className="text-xs text-teal-100 font-medium block mt-0.5">
                    Blood, X-ray, Lab Photo or PDF
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-teal-200 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleOpenScanChoice('medicine')}
                className="w-full rounded-3xl bg-indigo-700 text-white p-4 shadow-md shadow-indigo-700/20 hover:bg-indigo-800 transition active:scale-98 flex items-center gap-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                  <Pill className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-base font-black block leading-tight">
                    {mt.scanMedicineBtn}
                  </span>
                  <span className="text-xs text-indigo-100 font-medium block mt-0.5">
                    {mt.scanMedicineHint}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-indigo-200 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleOpenScanChoice('prescription')}
                className="w-full rounded-3xl bg-white border-2 border-slate-200 text-slate-900 p-4 shadow-xs hover:border-teal-500 hover:bg-teal-50/30 transition active:scale-98 flex items-center gap-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-base font-black block leading-tight">
                    {mt.scanPrescriptionBtn}
                  </span>
                  <span className="text-xs text-slate-500 font-medium block mt-0.5">
                    Doctor&apos;s written slip or PDF
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
              </button>

              {/* Compact Try Demo Row */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDemoSelector(true)}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-teal-300 bg-teal-50/70 py-2.5 px-3 text-xs font-bold text-teal-800 hover:bg-teal-100 transition active:scale-98"
                >
                  <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="truncate">{t.demoReportBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDemoMedicineSelector(true)}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-indigo-300 bg-indigo-50/70 py-2.5 px-3 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition active:scale-98"
                >
                  <Pill className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="truncate">{mt.tryDemoMedicineBtn}</span>
                </button>
              </div>
            </div>

            {/* Recently Scanned Medicines Row */}
            {savedMedicines.length > 0 && (
              <div className="w-full max-w-sm mt-6 text-left">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2 px-1">
                  {mt.recentMedicinesTitle}
                </h3>
                <div className="flex gap-2.5 overflow-x-auto pb-1">
                  {savedMedicines.slice(0, 4).map((med) => (
                    <button
                      key={med.id}
                      type="button"
                      onClick={() => {
                        setActiveMedicine(med);
                        setMedicineReturnScreen('home');
                        setCurrentScreen('medicine_result');
                      }}
                      className="shrink-0 w-44 rounded-2xl bg-white border border-slate-200 p-3 text-left shadow-xs hover:border-indigo-400 transition flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 truncate block">
                          {med.medicine.brand}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 truncate block">
                          {med.medicine.salt || 'Pack saved'}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Privacy note */}
            <div className="mt-6 p-3.5 rounded-2xl bg-slate-100/80 border border-slate-200/80 max-w-sm text-left flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                {t.privacyNote}
              </p>
            </div>
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

        {/* MEDICINE STEP 1: SCAN STRIP / BOX */}
        {currentScreen === 'medicine_scan' && (
          <CameraScanner
            language={currentLanguage}
            initialMode={scanInitialMode}
            scannerHint="Align medicine strip or box inside frame"
            onAnalyze={handleIdentifyMedicine}
            onCancel={() => setCurrentScreen('home')}
          />
        )}

        {/* MEDICINE CONFIRMATION / CORRECTION SCREEN */}
        {currentScreen === 'medicine_confirm' && step1Result && (
          <MedicineConfirmScreen
            language={currentLanguage}
            step1Result={step1Result}
            packThumbnail={pendingMedicineImages[0]}
            isManualMode={isManualConfirmMode}
            onConfirm={(confirmed) => {
              setStep1Result(confirmed);
              setCurrentScreen('medicine_problem');
            }}
            onRetake={() => {
              if (isManualConfirmMode) {
                setCurrentScreen('home');
              } else {
                setCurrentScreen('medicine_scan');
              }
            }}
          />
        )}

        {/* MEDICINE PROBLEM CONTEXT SCREEN */}
        {currentScreen === 'medicine_problem' && step1Result && (
          <ProblemContextScreen
            language={currentLanguage}
            photoCount={pendingMedicineImages.length}
            onSubmit={(problem, docImages) =>
              handleVerifyAndExplainMedicine(step1Result, problem, docImages)
            }
            onBack={() => setCurrentScreen('medicine_confirm')}
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

        {/* PRESCRIPTION FLOW: SCAN */}
        {currentScreen === 'prescription_scan' && (
          <CameraScanner
            language={currentLanguage}
            initialMode={scanInitialMode}
            scannerHint="Align doctor's prescription inside frame"
            onAnalyze={handleAnalyzePrescription}
            onCancel={() => setCurrentScreen('home')}
          />
        )}

        {/* PRESCRIPTION FLOW: VERIFY LINES */}
        {currentScreen === 'prescription_verify' && prescriptionDraft && (
          <PrescriptionVerifyScreen
            language={currentLanguage}
            draft={prescriptionDraft}
            onConfirm={handleExplainPrescription}
            onBack={() => setCurrentScreen('home')}
          />
        )}

        {/* PRESCRIPTION FLOW: EXPLAINED SUMMARY */}
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

        {/* MY MEDICINES SCREEN */}
        {currentScreen === 'my_medicines' && (
          <MyMedicines
            language={currentLanguage}
            onSelectMedicine={(med) => {
              setActiveMedicine(med);
              setMedicineReturnScreen('my_medicines');
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

        {/* PAST REPORTS */}
        {currentScreen === 'past_reports' && (
          <PastReports
            language={currentLanguage}
            onSelectReport={(rep) => {
              setActiveReport(rep);
              setCurrentScreen('dashboard');
            }}
            onBackToHome={() => setCurrentScreen('home')}
            onDataReset={() => {
              setProfile(getStoredProfile());
              setCurrentScreen('home');
            }}
          />
        )}
      </main>

      {/* Permanent Visible Footer */}
      <footer
        className={`mt-auto bg-white border-t border-slate-200 py-3 px-4 text-center ${
          ['home', 'past_reports', 'my_medicines'].includes(currentScreen) && !isProcessing
            ? 'pb-20'
            : ''
        }`}
      >
        <p className="text-[11px] sm:text-xs font-bold text-slate-600 max-w-md mx-auto leading-snug">
          {t.permanentFooter}
        </p>
      </footer>

      {/* Bottom Tab Navigation Bar on Main Screens */}
      {['home', 'past_reports', 'my_medicines'].includes(currentScreen) && !isProcessing && (
        <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-1.5 shadow-lg">
          <div className="max-w-xl mx-auto grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setCurrentScreen('home')}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] font-bold transition ${
                currentScreen === 'home'
                  ? 'text-teal-700 bg-teal-50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentScreen('past_reports')}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] font-bold transition ${
                currentScreen === 'past_reports'
                  ? 'text-teal-700 bg-teal-50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-5 h-5" />
              <span className="truncate max-w-full px-1">
                {t.pastReportsBtn}
                {savedReports.length > 0 ? ` (${savedReports.length})` : ''}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentScreen('my_medicines')}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] font-bold transition ${
                currentScreen === 'my_medicines'
                  ? 'text-indigo-700 bg-indigo-50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FolderHeart className="w-5 h-5" />
              <span className="truncate max-w-full px-1">
                {mt.myMedicinesBtn}
                {savedMedicines.length > 0 ? ` (${savedMedicines.length})` : ''}
              </span>
            </button>
          </div>
        </nav>
      )}

      {/* Camera vs Upload Photo / PDF Choice Modal */}
      {scanChoiceTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                {scanChoiceTarget === 'report'
                  ? t.scanCameraBtn
                  : scanChoiceTarget === 'medicine'
                  ? mt.scanMedicineBtn
                  : mt.scanPrescriptionBtn}
              </h3>
              <button
                type="button"
                onClick={() => setScanChoiceTarget(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleLaunchChosenScan('camera')}
              className="w-full flex items-center gap-3.5 rounded-2xl bg-teal-700 text-white p-4 text-left shadow-sm hover:bg-teal-800 transition active:scale-98"
            >
              <Camera className="w-6 h-6 shrink-0" />
              <div>
                <span className="text-sm font-black block">Take Photo with Camera</span>
                <span className="text-xs text-teal-100">Use rear camera</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleLaunchChosenScan('gallery')}
              className="w-full flex items-center gap-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-900 p-4 text-left hover:bg-slate-200 transition active:scale-98"
            >
              <ImageIcon className="w-6 h-6 text-teal-700 shrink-0" />
              <div>
                <span className="text-sm font-black block">Upload Photo or PDF</span>
                <span className="text-xs text-slate-600">Pick from gallery or WhatsApp PDF</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Editable Health Profile Modal */}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Select a Demo Report
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Explore how ReportSamjho simplifies different medical reports:
            </p>

            <div className="space-y-2.5">
              {demoReports.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => handleSelectDemoReport(demo)}
                  className="w-full text-left rounded-2xl border border-slate-200 p-3 hover:border-teal-500 hover:bg-teal-50/50 transition flex items-center justify-between group"
                >
                  <div>
                    <span className="font-bold text-xs text-slate-900 group-hover:text-teal-900 block">
                      {demo.report_type}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      {demo.findings.length} findings • {demo.overall_severity.toUpperCase()} status
                    </span>
                  </div>
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-md">
                    Open
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowDemoSelector(false)}
              className="mt-5 w-full rounded-2xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Demo Medicine Selection Modal */}
      {showDemoMedicineSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Select a Demo Medicine
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Sample medicine results (DEMO - not a real scan):
            </p>

            <div className="space-y-2.5">
              {demoMedicines.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => handleSelectDemoMedicine(demo)}
                  className="w-full text-left rounded-2xl border border-slate-200 p-3 hover:border-indigo-500 hover:bg-indigo-50/50 transition flex items-center justify-between group"
                >
                  <div>
                    <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-900 block">
                      {demo.medicine.brand}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      {demo.medicine.salt} •{' '}
                      {demo.medicine.access_level === 'otc'
                        ? 'Shop buy (OTC)'
                        : 'Prescription only'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md">
                    Open
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowDemoMedicineSelector(false)}
              className="mt-5 w-full rounded-2xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
