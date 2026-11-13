export interface ImageQualityResult {
  isAcceptable: boolean;
  reason?: 'dark' | 'blurry' | 'glare' | 'low_contrast';
  brightness: number; // 0 - 255
  contrast: number;   // standard deviation of luminance
  sharpness: number;  // approximation of edge variance
  message: string;
}

/**
 * Analyzes an image element or data URL on canvas to check if it's too dark or blurry
 */
export async function analyzeImageQuality(imageSource: string | HTMLImageElement): Promise<ImageQualityResult> {
  return new Promise((resolve) => {
    const img = typeof imageSource === 'string' ? new Image() : imageSource;
    if (typeof imageSource === 'string') {
      img.crossOrigin = 'anonymous';
      img.src = imageSource;
    }

    const runAnalysis = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({ isAcceptable: true, brightness: 128, contrast: 50, sharpness: 100, message: 'OK' });
        }

        // Downscale to 200x200 for fast pixel calculation
        canvas.width = 200;
        canvas.height = 200;
        ctx.drawImage(img, 0, 0, 200, 200);

        const imgData = ctx.getImageData(0, 0, 200, 200);
        const data = imgData.data;

        let totalBrightness = 0;
        const luminances: number[] = new Array(200 * 200);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Standard relative luminance
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          luminances[i / 4] = lum;
          totalBrightness += lum;
        }

        const avgBrightness = totalBrightness / (200 * 200);

        // Calculate contrast (std dev of luminance)
        let varianceSum = 0;
        for (let i = 0; i < luminances.length; i++) {
          varianceSum += Math.pow(luminances[i] - avgBrightness, 2);
        }
        const contrast = Math.sqrt(varianceSum / luminances.length);

        // Simple Laplacian / edge difference metric
        let edgeSum = 0;
        let edgeSamples = 0;
        for (let y = 1; y < 199; y += 2) {
          for (let x = 1; x < 199; x += 2) {
            const idx = y * 200 + x;
            const center = luminances[idx];
            const up = luminances[(y - 1) * 200 + x];
            const down = luminances[(y + 1) * 200 + x];
            const left = luminances[y * 200 + (x - 1)];
            const right = luminances[y * 200 + (x + 1)];
            const laplacian = Math.abs(4 * center - (up + down + left + right));
            edgeSum += laplacian;
            edgeSamples++;
          }
        }
        const sharpness = edgeSamples > 0 ? edgeSum / edgeSamples : 50;

        // Threshold checks:
        // Medical paper is usually white (> 120). If average brightness is below 45, it is way too dark.
        if (avgBrightness < 45) {
          return resolve({
            isAcceptable: false,
            reason: 'dark',
            brightness: avgBrightness,
            contrast,
            sharpness,
            message: 'Photo is too dark. Please take photo with more light.',
          });
        }

        // If contrast is extremely low (< 16) or sharpness is extremely low (< 4.5), likely blurry or out of focus
        if (contrast < 18 || sharpness < 5.0) {
          return resolve({
            isAcceptable: false,
            reason: 'blurry',
            brightness: avgBrightness,
            contrast,
            sharpness,
            message: 'Photo is blurry or text is not clear. Please hold phone steady.',
          });
        }

        return resolve({
          isAcceptable: true,
          brightness: avgBrightness,
          contrast,
          sharpness,
          message: 'OK',
        });
      } catch (err) {
        console.warn('Image quality analysis failed', err);
        return resolve({ isAcceptable: true, brightness: 128, contrast: 50, sharpness: 100, message: 'OK' });
      }
    };

    if (img.complete && img.naturalWidth > 0) {
      runAnalysis();
    } else {
      img.onload = runAnalysis;
      img.onerror = () => {
        resolve({ isAcceptable: false, reason: 'blurry', brightness: 0, contrast: 0, sharpness: 0, message: 'Could not load image' });
      };
    }
  });
}

/**
 * Resizes and compresses an image to JPEG format under maxDimension (default 1080px)
 */
export async function compressImage(dataUrlOrBlob: string | Blob, maxDimension = 1080, quality = 0.76): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const loadHandler = () => {
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(typeof dataUrlOrBlob === 'string' ? dataUrlOrBlob : '');
      }

      // Draw white background in case of transparent PNG
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.onload = loadHandler;
    img.onerror = (e) => reject(e);

    if (typeof dataUrlOrBlob === 'string') {
      img.src = dataUrlOrBlob;
    } else {
      img.src = URL.createObjectURL(dataUrlOrBlob);
    }
  });
}
