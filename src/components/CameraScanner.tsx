import React, { useRef, useState, useEffect, useCallback } from 'react';
import { SupportedLanguage, translations } from '../utils/translations';
import { analyzeImageQuality, compressImage, ImageQualityResult } from '../utils/imageQuality';
import { isPdfFile, renderPdfToJpegPages } from '../utils/pdfUtils';
import { Camera, Image as ImageIcon, X, AlertTriangle, RefreshCw, Plus, Check, ArrowLeft, Flashlight, Loader2 } from 'lucide-react';

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
  scannerHint,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(initialMode === 'camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [pages, setPages] = useState<string[]>([]);
  const [lastQualityCheck, setLastQualityCheck] = useState<ImageQualityResult | null>(null);
  const [isProcessingCapture, setIsProcessingCapture] = useState<boolean>(false);

  const t = translations[language];

  // Stop camera media tracks
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start device camera
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser environment');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: unknown) {
      console.warn('Camera access failed, falling back to file picker:', err);
      const message = err instanceof Error ? err.message : String(err);
      setCameraError(message.includes('Permission') ? 'Camera permission was denied.' : 'Camera not available.');
      setCameraActive(false);
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (cameraActive) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [cameraActive, startCamera, stopCamera]);

  // Toggle torch/flashlight if supported
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState } as MediaTrackConstraintSet],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Torch constraint not supported', err);
      }
    }
  };

  // Flip front/rear camera
  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Process captured image: compress & check quality
  const handleProcessImage = async (dataUrl: string) => {
    setIsProcessingCapture(true);
    try {
      const compressed = await compressImage(dataUrl, 960, 0.7);
      const quality = await analyzeImageQuality(compressed);

      if (!quality.isAcceptable) {
        setLastQualityCheck(quality);
      } else {
        setLastQualityCheck(null);
      }

      // Add to pages
      setPages((prev) => [...prev, compressed]);
    } catch (err) {
      console.error('Failed to process image capture', err);
    } finally {
      setIsProcessingCapture(false);
    }
  };

  // Snap photo from video element
  const takePhoto = async () => {
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

  // Handle files selected via file input (gallery / PDF)
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
          } catch (pdfErr) {
            console.error('PDF render failed', pdfErr);
            setLastQualityCheck({
              isAcceptable: false,
              reason: 'blurry',
              brightness: 0,
              contrast: 0,
              sharpness: 0,
              message: 'Could not open this PDF. Try a photo or screenshot instead.',
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

  // Remove a specific page
  const removePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
    if (pages.length <= 1) {
      setLastQualityCheck(null);
    }
  };

  // Finalize & Analyze
  const handleProceedToAnalyze = () => {
    if (pages.length === 0) return;
    stopCamera();
    onAnalyze(pages);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-10">
        <button
          type="button"
          onClick={() => {
            stopCamera();
            onCancel();
          }}
          className="flex items-center gap-1.5 rounded-full p-2 text-slate-300 hover:text-white hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs font-bold">{t.backToHome}</span>
        </button>

        <div className="text-center">
          <span className="text-xs font-bold text-teal-400">
            {pages.length} {t.pagesCaptured}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {cameraActive && (
            <>
              <button
                type="button"
                onClick={toggleTorch}
                title="Flashlight"
                className={`p-2 rounded-full transition ${
                  torchOn ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Flashlight className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={flipCamera}
                title="Flip Camera"
                className="p-2 rounded-full text-slate-300 hover:bg-slate-800 transition"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Camera / Viewport Area */}
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

            {/* Document Scanner Frame Overlay with Corner Guides */}
            <div className="absolute inset-8 sm:inset-12 pointer-events-none flex flex-col justify-between">
              {/* Top Corners */}
              <div className="flex justify-between">
                <div className="w-8 h-8 border-t-4 border-l-4 border-teal-400 rounded-tl-lg shadow-sm" />
                <div className="w-8 h-8 border-t-4 border-r-4 border-teal-400 rounded-tr-lg shadow-sm" />
              </div>

              {/* Center Helper Text */}
              <div className="text-center">
                <span className="bg-slate-950/70 text-slate-200 text-xs px-3.5 py-1.5 rounded-full backdrop-blur-md border border-slate-700 font-medium">
                  {scannerHint || 'Align medical report inside frame'}
                </span>
              </div>

              {/* Bottom Corners */}
              <div className="flex justify-between">
                <div className="w-8 h-8 border-b-4 border-l-4 border-teal-400 rounded-bl-lg shadow-sm" />
                <div className="w-8 h-8 border-b-4 border-r-4 border-teal-400 rounded-br-lg shadow-sm" />
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 text-center max-w-sm">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-teal-400 mb-4 border border-slate-700">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {cameraError || 'Camera unavailable'}
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              You can select saved report photos or PDF documents directly from your phone.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-teal-500 transition active:scale-95"
            >
              <ImageIcon className="w-5 h-5" />
              <span>Choose Photo or PDF</span>
            </button>
          </div>
        )}

        {isProcessingCapture && (
          <div className="absolute inset-0 z-30 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white">
            <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
            <span className="text-xs font-bold">Preparing clear pages...</span>
          </div>
        )}

        {/* Quality Warning Banner if blurry/dark */}
        {lastQualityCheck && (
          <div className="absolute top-4 left-4 right-4 z-20 rounded-2xl bg-amber-500/95 p-3.5 text-slate-950 shadow-xl backdrop-blur-md border border-amber-300">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-slate-950 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-black uppercase tracking-wider">
                  {t.retakePhoto}
                </h4>
                <p className="text-xs font-semibold mt-0.5 leading-snug">
                  {lastQualityCheck.message || t.blurryWarning}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (pages.length > 0) {
                        removePage(pages.length - 1);
                      }
                      setLastQualityCheck(null);
                      if (!cameraActive) {
                        fileInputRef.current?.click();
                      }
                    }}
                    className="rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900 transition"
                  >
                    Retake Photo
                  </button>
                  {pages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setLastQualityCheck(null)}
                      className="rounded-xl bg-white/70 px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-white transition"
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

      {/* Multi-Page Thumbnail Strip */}
      {pages.length > 0 && (
        <div className="bg-slate-900 px-4 py-2 border-t border-slate-800 flex items-center gap-3 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">
            Pages ({pages.length}):
          </span>
          <div className="flex items-center gap-2">
            {pages.map((imgUrl, idx) => (
              <div key={idx} className="relative shrink-0 group">
                <img
                  src={imgUrl}
                  alt={`Page ${idx + 1}`}
                  className="w-12 h-16 object-cover rounded-lg border-2 border-teal-500 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => removePage(idx)}
                  className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 shadow-md hover:bg-rose-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <span className="absolute bottom-0 inset-x-0 bg-black/70 text-center text-[9px] font-bold text-white py-0.5 rounded-b-md">
                  P.{idx + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div className="bg-slate-950 px-6 py-4 flex items-center justify-between gap-4 border-t border-slate-900">
        {/* Gallery / File Picker Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-1 text-slate-300 hover:text-white transition"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700">
            <ImageIcon className="w-6 h-6 text-teal-400" />
          </div>
          <span className="text-[11px] font-semibold">Gallery</span>
        </button>

        {/* Big Shutter / Capture Button */}
        {cameraActive && (
          <button
            type="button"
            disabled={isProcessingCapture}
            onClick={takePhoto}
            aria-label="Capture photo"
            className="w-18 h-18 rounded-full border-4 border-white p-1 flex items-center justify-center bg-teal-500 hover:bg-teal-400 transition active:scale-95 shadow-lg disabled:opacity-50"
          >
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
              {pages.length > 0 ? (
                <Plus className="w-7 h-7 text-teal-700" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-teal-600" />
              )}
            </div>
          </button>
        )}

        {/* Analyze / Finish Button */}
        <button
          type="button"
          disabled={pages.length === 0}
          onClick={handleProceedToAnalyze}
          className={`flex flex-col items-center gap-1 transition ${
            pages.length > 0
              ? 'text-teal-400 hover:text-teal-300 active:scale-95'
              : 'text-slate-600 pointer-events-none'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
              pages.length > 0
                ? 'bg-teal-600 text-white border-teal-500 shadow-md animate-pulse'
                : 'bg-slate-900 text-slate-600 border-slate-800'
            }`}
          >
            <Check className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-bold">
            {pages.length > 0 ? t.analyzePages : 'No Pages'}
          </span>
        </button>
      </div>

      {/* Hidden File Input (Supports Photos & Lab PDFs) */}
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
