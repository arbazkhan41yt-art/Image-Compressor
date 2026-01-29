
import { CompressionResult, CropArea } from "../types";

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export const getImageDimensions = (url: string): Promise<{width: number, height: number}> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.src = url;
  });
};

export const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const compressImage = async (
  imageSrc: string,
  quality: number,
  format: string,
  detailPreservation: number = 70,
  targetWidth?: number,
  targetHeight?: number,
  crop?: CropArea,
  stripMetadata: boolean = true
): Promise<CompressionResult> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      const sX = crop ? (crop.x * img.width) / 100 : 0;
      const sY = crop ? (crop.y * img.height) / 100 : 0;
      const sW = crop ? (crop.width * img.width) / 100 : img.width;
      const sH = crop ? (crop.height * img.height) / 100 : img.height;

      const fW = targetWidth || sW;
      const fH = targetHeight || sH;
      
      canvas.width = fW;
      canvas.height = fH;
      
      const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
      if (!ctx) return reject(new Error("Canvas context failed"));

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = detailPreservation > 80 ? 'high' : detailPreservation > 40 ? 'medium' : 'low';

      ctx.drawImage(img, sX, sY, sW, sH, 0, 0, fW, fH);
      
      const exportFormat = format === 'image/avif' ? 'image/webp' : format; // Simple fallback check
      
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Compression failed"));
          resolve({
            blob,
            url: URL.createObjectURL(blob),
            size: blob.size,
            quality,
            reduction: 0,
            width: Math.round(fW),
            height: Math.round(fH),
            format: exportFormat.split('/')[1].toUpperCase()
          });
        },
        exportFormat,
        quality / 100
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
  });
};
