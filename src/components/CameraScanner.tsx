import React, { useRef, useState, useEffect, useCallback } from 'react';
import { SupportedLanguage, translations } from '../utils/translations';
import { analyzeImageQuality, compressImage, ImageQualityResult } from '../utils/imageQuality';
import { isPdfFile, renderPdfToJpegPages } from '../utils/pdfUtils';
import { triggerLightHaptic } from '../utils/haptics';
import { Camera, Image as ImageIcon, X, AlertTriangle, Plus, Check, ArrowLeft, Loader2 } from 'lucide-react';

interface CameraScannerProps {
  language: SupportedLanguage;
  onAnalyze: (compressedImages: string[]) => void;
  onCancel: () => void;
  initialMode?: 'camera' | 'gallery';
  scannerHint?: string;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  language,
  onAnalyze,
  onCancel,
  initialMode = 'camera',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(initialMode === 'camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [lastQualityCheck, setLastQualityCheck] = useState<ImageQualityResult | null>(null);
  const [isProcessingCapture, setIsProcessingCapture] = useState<boolean>(false);

  const t = translations[language];

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError('Camera unavailable');
      setCameraActive(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (cameraActive) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [cameraActive, startCamera, stopCamera]);

  const handleProcessImage = async (dataUrl: string) => {
    setIsProcessingCapture(true);
    try {
      const compressed = await compressImage(dataUrl, 960, 0.7);
      const quality = await analyzeImageQuality(compressed);

      if (!quality.isAcceptable) {
        setLastQualityCheck(quality);
        setPages((prev) => [...prev, compressed]);
      } else {
        setLastQualityCheck(null);
        setPages((prev) => [...prev, compressed]);
      }
    } catch (err) {
      console.error('Failed to process image capture', err);
    } finally {
      setIsProcessingCapture(false);
    }
  };

  const takePhoto = async () => {
    triggerLightHaptic();
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    await handleProcessImage(dataUrl);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    setIsProcessingCapture(true);

    try {
      for (const file of files) {
        if (isPdfFile(file)) {
          try {
            const pdfPages = await renderPdfToJpegPages(file, 6);
            if (pdfPages.length > 0) {
              setLastQualityCheck(null);
              setPages((prev) => [...prev, ...pdfPages].slice(0, 6));
            }
          } catch {
            setLastQualityCheck({
              isAcceptable: false,
              reason: 'blurry',
              brightness: 0,
              contrast: 0,
              sharpness: 0,
              message: 'Could not open PDF. Try a photo instead.',
            });
          }
          continue;
        }

        const reader = new FileReader();
        await new Promise<void>((resolve) => {
          reader.onload = async (event) => {
            if (event.target?.result) {
              await handleProcessImage(event.target.result as string);
            }
            resolve();
          };
          reader.readAsDataURL(file);
        });
      }
    } finally {
      setIsProcessingCapture(false);
      e.target.value = '';
    }
  };

  const removePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
    if (pages.length <= 1) {
      setLastQualityCheck(null);
    }
  };

  const handleProceedToAnalyze = () => {
    if (pages.length === 0) return;
    triggerLightHaptic();
    stopCamera();
    onAnalyze(pages);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-text)] text-white select-none">
      {/* Minimal Top Back Icon */}
      <div className="absolute top-4 left-4 z-20">
        <button
          type="button"
          onClick={() => {
            stopCamera();
            onCancel();
          }}
          aria-label="Back"
          className="w-11 h-11 rounded-full bg-black/45 text-white flex items-center justify-center hover:bg-black/65 transition"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      {/* Full-Screen Camera Viewport */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {cameraActive ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Simple Corner Frame Guide */}
            <div className="absolute inset-10 sm:inset-14 pointer-events-none flex flex-col justify-between">
              <div className="flex justify-between">
                <div className="w-9 h-9 border-t-4 border-l-4 border-white rounded-tl-xl" />
                <div className="w-9 h-9 border-t-4 border-r-4 border-white rounded-tr-xl" />
              </div>
              <div className="flex justify-between">
                <div className="w-9 h-9 border-b-4 border-l-4 border-white rounded-bl-xl" />
                <div className="w-9 h-9 border-b-4 border-r-4 border-white rounded-br-xl" />
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 text-center max-w-xs space-y-5">
            <div className="mx-auto w-16 h-16 rounded-[16px] bg-white/10 flex items-center justify-center text-white">
              <Camera className="w-8 h-8" />
            </div>
            <p className="text-base font-bold text-white/90">{cameraError || 'Upload Photo or PDF'}</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rs-btn-primary inline-flex items-center gap-2.5 px-6 py-3.5 text-base font-bold"
            >
              <ImageIcon className="w-5 h-5" />
              <span>Choose Photo or PDF</span>
            </button>
          </div>
        )}

        {isProcessingCapture && (
          <div className="absolute inset-0 z-30 bg-black/70 flex flex-col items-center justify-center gap-2 text-white">
            <Loader2 className="w-9 h-9 animate-spin text-white" />
          </div>
        )}

        {/* Blurry / Dark Photo Quality Banner */}
        {lastQualityCheck && (
          <div className="absolute top-18 left-4 right-4 z-20 rounded-[16px] bg-[var(--color-caution-soft)] p-4 text-[var(--color-text)] shadow-[var(--shadow-card)]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-[var(--color-caution)] shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2.5">
                <p className="text-base font-extrabold">{t.retakePhoto}</p>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (pages.length > 0) removePage(pages.length - 1);
                      setLastQualityCheck(null);
                      if (!cameraActive) fileInputRef.current?.click();
                    }}
                    className="rounded-[12px] bg-[var(--color-text)] px-4 py-2 text-base font-bold text-white"
                  >
                    Retake
                  </button>
                  {pages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setLastQualityCheck(null)}
                      className="rounded-[12px] bg-[var(--color-surface)] px-4 py-2 text-base font-bold text-[var(--color-text)]"
                    >
                      {t.blurryProceed}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Minimal Captured Pages Strip (only shown after 1+ capture) */}
      {pages.length > 0 && (
        <div className="bg-[var(--color-text)] px-4 py-2.5 flex items-center gap-2.5 overflow-x-auto">
          {pages.map((imgUrl, idx) => (
            <div key={idx} className="relative shrink-0">
              <img
                src={imgUrl}
                alt={`Page ${idx + 1}`}
                className="w-12 h-15 object-cover rounded-[10px] border-2 border-[var(--color-brand)]"
              />
              <button
                type="button"
                onClick={() => removePage(idx)}
                style={{ minHeight: '24px' }}
                className="absolute -top-1.5 -right-1.5 bg-[var(--color-text)] border border-white text-white rounded-full p-0.5"
                aria-label="Remove page"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Minimal Bottom Controls: Small Gallery Icon + Big Capture Button (+ Check when ready) */}
      <div className="bg-black px-8 py-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Open gallery"
          className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition"
        >
          <ImageIcon className="w-6 h-6" />
        </button>

        {cameraActive ? (
          <button
            type="button"
            disabled={isProcessingCapture}
            onClick={takePhoto}
            aria-label="Capture photo"
            className="w-20 h-20 rounded-full border-4 border-white p-1.5 flex items-center justify-center bg-[var(--color-brand)] active:scale-95 disabled:opacity-50"
          >
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              {pages.length > 0 && <Plus className="w-7 h-7 text-[var(--color-brand)]" />}
            </div>
          </button>
        ) : (
          <div className="w-20 h-20" />
        )}

        {pages.length > 0 ? (
          <button
            type="button"
            onClick={handleProceedToAnalyze}
            aria-label="Use photos"
            className="w-12 h-12 rounded-full bg-[var(--color-brand)] text-white flex items-center justify-center hover:bg-[var(--color-brand-hover)] transition"
          >
            <Check className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-12 h-12" />
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};
