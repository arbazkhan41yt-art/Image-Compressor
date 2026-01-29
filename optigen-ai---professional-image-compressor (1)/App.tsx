import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Upload, Archive, Settings, Download, CheckCircle, RefreshCw, 
  FileImage, Sparkles, Maximize2, Minimize2, AlertCircle, Cpu, Wand2, 
  ShieldCheck, Lock, Unlock, Trash2, Layers, Crop, Grid, DownloadCloud,
  ChevronRight, Info, Zap, ArrowRight, Minus, Plus
} from 'lucide-react';
import JSZip from 'jszip';
import { ImageFile, CompressionResult, AIAnalysis, AppState, CropArea } from './types';
import { analyzeImage } from './services/aiService';
import { fileToBase64, formatSize, compressImage, getImageDimensions } from './lib/imageUtils';

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [imageList, setImageList] = useState<ImageFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Manual Settings State
  const [quality, setQuality] = useState(75);
  const [detailPreservation, setDetailPreservation] = useState(95);
  const [scale, setScale] = useState(100);
  const [format, setFormat] = useState('image/webp');
  const [stripMetadata, setStripMetadata] = useState(true);
  const [targetWidth, setTargetWidth] = useState<string>('');
  const [targetHeight, setTargetHeight] = useState<string>('');
  const [useSmartCrop, setUseSmartCrop] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentImage = imageList.find(img => img.id === selectedId) || null;

  // Sync manual dimension inputs when selection changes
  useEffect(() => {
    if (currentImage) {
      setTargetWidth(Math.round(currentImage.width * (scale / 100)).toString());
      setTargetHeight(Math.round(currentImage.height * (scale / 100)).toString());
    }
  }, [selectedId, scale]);

  /**
   * LIVE PREVIEW LOGIC
   * Recalculates the "Final Size" automatically when sliders change
   */
  useEffect(() => {
    if (!currentImage || appState === AppState.PROCESSING) return;

    const debounceTimer = setTimeout(() => {
      manualOptimize(true); // Run silent optimization for preview
    }, 100);

    return () => clearTimeout(debounceTimer);
  }, [quality, detailPreservation, scale, format, stripMetadata, useSmartCrop, selectedId, targetWidth, targetHeight]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    const newImages: ImageFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      const preview = URL.createObjectURL(file);
      const dims = await getImageDimensions(preview);
      newImages.push({
        id: Math.random().toString(36).substr(2, 9),
        file, preview, name: file.name, size: file.size, type: file.type,
        width: dims.width, height: dims.height, status: 'idle', useSmartCrop: false
      });
    }
    setImageList(prev => [...prev, ...newImages]);
    if (newImages.length > 0 && !selectedId) setSelectedId(newImages[0].id);
  };

  const updateImageInList = (id: string, updates: Partial<ImageFile>) => {
    setImageList(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
  };

  const triggerAnalysis = async (id: string) => {
    const img = imageList.find(i => i.id === id);
    if (!img || img.analysis || img.status === 'analyzing') return;
    updateImageInList(id, { status: 'analyzing' });
    try {
      const base64 = await fileToBase64(img.file);
      const analysis = await analyzeImage(base64, img.file.type);
      updateImageInList(id, { analysis, status: 'idle' });
    } catch (e) {
      updateImageInList(id, { status: 'idle' }); // Reset on error to avoid hang
    }
  };

  const manualOptimize = async (silent = false) => {
    if (!currentImage) return;
    if (!silent) updateImageInList(currentImage.id, { status: 'optimizing' });
    try {
      const result = await compressImage(
        currentImage.preview,
        quality,
        format,
        detailPreservation,
        targetWidth ? parseInt(targetWidth) : undefined,
        targetHeight ? parseInt(targetHeight) : undefined,
        useSmartCrop ? currentImage.analysis?.smartCropSuggestion : undefined,
        stripMetadata
      );
      updateImageInList(currentImage.id, {
        result: { ...result, reduction: ((currentImage.size - result.size) / currentImage.size) * 100 },
        status: silent ? currentImage.status : 'completed'
      });
    } catch (e) {
      if (!silent) updateImageInList(currentImage.id, { status: 'error' });
    }
  };

  /**
   * RECURSIVE SMART AUTO-COMPRESS LOGIC (50KB TARGET)
   * Precisely reduces quality and scale until the target size is met.
   */
  const iterativeCompressToTarget = async (img: ImageFile, analysis: AIAnalysis, target: number): Promise<CompressionResult | null> => {
    const fmt = `image/${analysis.suggestedFormat || 'webp'}`;
    let bestRes: CompressionResult | null = null;

    // Stage 1: Quality Search (Original Scale)
    let lowQ = 5, highQ = 90;
    while (lowQ <= highQ) {
      let midQ = Math.floor((lowQ + highQ) / 2);
      const res = await compressImage(img.preview, midQ, fmt, 85, undefined, undefined, analysis.smartCropSuggestion, true);
      if (res.size <= target) {
        bestRes = res;
        lowQ = midQ + 1; // Try better quality
      } else {
        highQ = midQ - 1; // Too big
      }
    }

    // Stage 2: Scale Search (if Q=5 is still too large)
    if (!bestRes || bestRes.size > target) {
      let lowS = 0.05, highS = 0.95;
      for (let iter = 0; iter < 8; iter++) { // 8 steps of scale refinement
        let midS = (lowS + highS) / 2;
        let tw = Math.round(img.width * midS);
        let th = Math.round(img.height * midS);
        const res = await compressImage(img.preview, 40, fmt, 80, tw, th, analysis.smartCropSuggestion, true);
        if (res.size <= target) {
          bestRes = res;
          lowS = midS; // Try larger scale
        } else {
          highS = midS; // Scale too big
        }
      }
    }

    return bestRes;
  };

  const applyAutoToBatch = async () => {
    if (imageList.length === 0) return;
    setAppState(AppState.PROCESSING);
    setProcessingProgress(0);
    const targetLimit = 50 * 1024; // 50KB

    for (let i = 0; i < imageList.length; i++) {
      const img = imageList[i];
      updateImageInList(img.id, { status: 'optimizing' });
      
      try {
        let analysis = img.analysis;
        if (!analysis) {
           const base64 = await fileToBase64(img.file);
           analysis = await analyzeImage(base64, img.file.type);
        }
        
        const result = await iterativeCompressToTarget(img, analysis, targetLimit);

        if (result) {
          updateImageInList(img.id, {
            analysis,
            result: { ...result, reduction: ((img.size - result.size) / img.size) * 100 },
            status: 'completed'
          });
        } else {
          updateImageInList(img.id, { status: 'error' });
        }
      } catch (e) {
        updateImageInList(img.id, { status: 'error' });
      }
      setProcessingProgress(((i + 1) / imageList.length) * 100);
    }
    setAppState(AppState.IDLE);
  };

  const downloadAllAsZip = async () => {
    const zip = new JSZip();
    let count = 0;
    imageList.forEach(img => {
      if (img.result?.blob) {
        const ext = img.result.format.toLowerCase();
        zip.file(`${img.name.split('.')[0]}_optigen.${ext}`, img.result.blob);
        count++;
      }
    });
    if (count === 0) return;
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `optigen_batch_${Date.now()}.zip`;
    link.click();
  };

  const downloadSingle = () => {
    if (!currentImage?.result) return;
    const link = document.createElement('a');
    link.href = currentImage.result.url;
    link.download = `optigen_${currentImage.name.split('.')[0]}.${currentImage.result.format.toLowerCase()}`;
    link.click();
  };

  const getFormatInfo = (f: string) => {
    switch (f) {
      case 'webp': return "Google's modern format. Excellent compression, supports transparency. Balanced choice for most websites.";
      case 'jpeg': return "Traditional format. Best compatibility with old devices. Good for photos, but no transparency support.";
      case 'png': return "Lossless format. Perfect for logos and text where transparency is needed. Large file size.";
      case 'avif': return "Next-gen format. Superior compression to WebP. Best for speed, though slightly less compatibility.";
      default: return "";
    }
  };

  useEffect(() => {
    if (selectedId) triggerAnalysis(selectedId);
  }, [selectedId]);

  return (
    <div className="min-h-screen max-w-[1600px] mx-auto flex flex-col items-center px-4 py-8 md:px-12">
      {/* Branding */}
      <header className="w-full flex flex-col items-center text-center mb-16">
        <div className="flex items-center gap-2 mb-4 bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/20">
          <Zap className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
          <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">AI Compression Engine</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tight gradient-text">OptiGen AI</h1>
        <p className="text-slate-500 text-sm max-w-xl font-medium tracking-wide">Smarter pixels, smaller files. Pro-grade optimization for the modern web.</p>
      </header>

      <main className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Queue List */}
          <div className="glass rounded-[2rem] p-6 space-y-4 max-h-[320px] overflow-y-auto custom-scrollbar shadow-2xl relative">
            <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2">
                 <Layers className="w-3.5 h-3.5 text-slate-500" />
                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Image Queue</h4>
               </div>
               <button 
                onClick={() => fileInputRef.current?.click()}
                title="Add more images"
                className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1.5 px-3"
               >
                 <Plus className="w-3 h-3" />
                 <span className="text-[9px] font-black uppercase tracking-widest">Add</span>
               </button>
            </div>

            {imageList.length === 0 ? (
              <div 
                className="h-32 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/30 transition-all opacity-40 hover:opacity-100"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-6 h-6 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">Upload Images</p>
                <input type="file" multiple ref={fileInputRef} className="hidden" onChange={e => handleFileUpload(e.target.files)} />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {imageList.map(img => (
                  <div 
                    key={img.id}
                    onClick={() => setSelectedId(img.id)}
                    className={`relative p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${selectedId === img.id ? 'bg-blue-600/10 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'bg-slate-900/40 border-transparent hover:bg-slate-800/40'}`}
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-black flex-shrink-0">
                      <img src={img.preview} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-[11px] font-bold truncate text-slate-200">{img.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md">{formatSize(img.size)}</span>
                        {img.status === 'completed' && <CheckCircle className="w-3 h-3 text-green-500" />}
                        {(img.status === 'optimizing' || img.status === 'analyzing') && <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />}
                        {img.status === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setImageList(prev => prev.filter(i => i.id !== img.id)); if(selectedId === img.id) setSelectedId(null); }}
                      className="p-2 text-slate-600 hover:text-red-400 opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={e => handleFileUpload(e.target.files)} />
          </div>

          {/* Auto-Compress Button */}
          <button 
            onClick={applyAutoToBatch}
            disabled={imageList.length === 0 || appState === AppState.PROCESSING}
            className="orange-gradient w-full py-6 rounded-3xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all group disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              {appState === AppState.PROCESSING ? <RefreshCw className="w-5 h-5 text-white animate-spin" /> : <Sparkles className="w-5 h-5 text-white" />}
              <span className="text-sm font-black uppercase tracking-[0.15em] text-white">Smart Auto-Compress (50KB Target)</span>
            </div>
          </button>

          {/* Manual Settings */}
          <div className="glass rounded-[2.5rem] p-8 space-y-8 shadow-2xl border border-white/5">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-500" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Manual Settings</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black uppercase text-slate-400">Quality</label>
                  <span className="text-[11px] font-black text-blue-400">{quality}%</span>
                </div>
                <input type="range" min="1" max="100" value={quality} onChange={e => setQuality(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg accent-blue-500" />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-black uppercase text-slate-400">Detail Preservation</label>
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  </div>
                  <span className="text-[11px] font-black text-green-400">{detailPreservation}%</span>
                </div>
                <input type="range" min="1" max="100" value={detailPreservation} onChange={e => setDetailPreservation(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg accent-green-500" />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black uppercase text-slate-400">Scale</label>
                  <span className="text-[11px] font-black text-purple-400">{scale}%</span>
                </div>
                <input type="range" min="10" max="200" value={scale} onChange={e => setScale(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg accent-purple-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-500">Width (PX)</label>
                <input type="number" value={targetWidth} onChange={e => setTargetWidth(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-white outline-none focus:border-blue-500/30" placeholder="Auto" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-500">Height (PX)</label>
                <input type="number" value={targetHeight} onChange={e => setTargetHeight(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-white outline-none focus:border-blue-500/30" placeholder="Auto" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-white/5 p-5 rounded-2xl flex items-center justify-between border border-white/5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span className="text-[11px] font-bold uppercase text-slate-300">Strip Metadata (EXIF)</span>
                </div>
                <input type="checkbox" checked={stripMetadata} onChange={e => setStripMetadata(e.target.checked)} className="w-5 h-5 rounded-lg accent-blue-500 cursor-pointer" />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {['webp', 'jpeg', 'png', 'avif'].map(f => (
                <div key={f} className="relative group">
                  <button 
                    onClick={() => setFormat(`image/${f}`)}
                    className={`w-full py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${format === `image/${f}` ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-800/40 border-white/5 text-slate-500 hover:text-slate-300'}`}
                  >
                    {f === 'jpeg' ? 'JPG' : f}
                  </button>
                  <div className="absolute top-1 right-1 opacity-40 hover:opacity-100 cursor-help transition-opacity">
                    <Info className="w-2.5 h-2.5" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-3 bg-slate-900 border border-white/10 rounded-xl text-[9px] font-medium leading-relaxed text-slate-200 z-50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] pointer-events-none text-center">
                      <div className="font-black uppercase mb-1 text-blue-400">{f === 'jpeg' ? 'JPG' : f}</div>
                      {getFormatInfo(f)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => manualOptimize()} disabled={!currentImage}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl border border-white/10 transition-all active:scale-95 disabled:opacity-20"
            >
              Manual Update
            </button>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="glass rounded-3xl p-6 border border-white/5 flex items-center gap-6 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
              <Sparkles className="w-7 h-7 text-green-400" />
            </div>
            <div className="flex-grow">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-200">Magic Optimizer Active</h4>
              <p className="text-[11px] text-slate-500 font-medium tracking-tight">Balancing scale and quality for a crisp 50KB target...</p>
            </div>
            {appState === AppState.PROCESSING && (
              <div className="bg-blue-500/10 px-6 py-3 rounded-2xl border border-blue-500/20 flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-[11px] font-black text-blue-400">{Math.round(processingProgress)}%</span>
              </div>
            )}
          </div>

          <div className="comparison-slider aspect-[16/10] bg-[#070b16] border border-white/5 shadow-inner relative group">
            {currentImage ? (
              <div className="relative w-full h-full overflow-hidden select-none">
                <div className="absolute inset-0">
                  <img src={currentImage.preview} className="w-full h-full object-contain" />
                  <div className="absolute bottom-10 left-10 bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-[0.25em] shadow-2xl">
                    Original • {formatSize(currentImage.size)}
                  </div>
                </div>

                <div 
                  className="absolute inset-0 z-1"
                  style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
                >
                  <img 
                    src={currentImage.result ? currentImage.result.url : currentImage.preview} 
                    className="w-full h-full object-contain" 
                  />
                  <div className="absolute bottom-10 right-10 bg-orange-600/90 backdrop-blur-md px-5 py-2.5 rounded-xl border border-white/20 text-[10px] font-black uppercase tracking-[0.25em] shadow-[0_10px_40px_rgba(234,88,12,0.4)]">
                    Optimized • {currentImage.result ? formatSize(currentImage.result.size) : 'Processing...'}
                  </div>
                </div>

                <div className="slider-handle" style={{ left: `${sliderPos}%` }}>
                  <div className="slider-handle-icon">||</div>
                </div>
                
                <input 
                  type="range" min="0" max="100" value={sliderPos} 
                  onChange={e => setSliderPos(parseInt(e.target.value))}
                  className="absolute inset-0 z-20 w-full h-full opacity-0 vertical-handle"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full opacity-20">
                <FileImage className="w-24 h-24 mb-6" />
                <p className="text-sm font-black uppercase tracking-[0.4em]">Awaiting Selection</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            <div className="glass rounded-3xl p-8 text-center flex flex-col justify-center min-h-[160px] shadow-2xl border border-white/5">
              <p className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Savings</p>
              <div className="text-5xl font-black text-green-400 tracking-tighter">
                {currentImage?.result ? `-${currentImage.result.reduction.toFixed(1)}%` : '-0.0%'}
              </div>
            </div>

            <div className="glass rounded-3xl p-8 text-center flex flex-col justify-center min-h-[160px] shadow-2xl border border-white/5">
              <p className="text-[10px] font-black uppercase text-slate-500 mb-5 tracking-widest">Complexity</p>
              <div className="flex justify-center gap-2">
                {[...Array(8)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`complexity-bar ${i < (currentImage?.analysis?.complexityScore || 4) ? 'active' : ''}`} 
                  />
                ))}
              </div>
            </div>

            <div className="glass rounded-3xl p-8 text-center flex flex-col justify-center min-h-[160px] shadow-2xl border border-white/5">
              <p className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Final Size</p>
              <div className="text-3xl font-black text-white">
                {currentImage?.result ? formatSize(currentImage.result.size) : '0 KB'}
              </div>
            </div>

            <button 
              onClick={downloadSingle}
              disabled={!currentImage?.result}
              className="bg-white text-black h-full rounded-3xl flex flex-col items-center justify-center gap-3 group hover:scale-[1.03] transition-all active:scale-95 disabled:opacity-30 disabled:grayscale min-h-[160px] shadow-[0_30px_60px_rgba(255,255,255,0.15)]"
            >
              <Download className="w-8 h-8 group-hover:translate-y-1 transition-transform" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">Download</span>
            </button>
          </div>

          {imageList.length > 1 && (
            <div className="flex justify-between items-center bg-white/5 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Archive className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <p className="text-[13px] font-black uppercase tracking-widest text-slate-200">Bulk Export Available</p>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tighter">{imageList.filter(i => i.result).length} / {imageList.length} Optimized</p>
                </div>
              </div>
              <button 
                onClick={downloadAllAsZip}
                disabled={!imageList.some(img => img.result)}
                className="bg-blue-600 text-white px-12 py-5 rounded-2xl flex items-center gap-4 hover:bg-blue-500 transition-all text-xs font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(37,99,235,0.3)] disabled:opacity-20"
              >
                <DownloadCloud className="w-5 h-5" /> Download All (ZIP)
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-28 opacity-30 flex flex-wrap justify-center gap-16 text-[11px] font-black uppercase tracking-[0.6em] pb-20 border-t border-white/5 pt-12 w-full max-w-4xl">
        <span className="flex items-center gap-3 hover:opacity-100 transition-opacity"><Layers className="w-4 h-4" /> Batch Processing</span>
        <span className="flex items-center gap-3 hover:opacity-100 transition-opacity"><Cpu className="w-4 h-4" /> Gemini AI Engine</span>
        <span className="flex items-center gap-3 hover:opacity-100 transition-opacity"><ShieldCheck className="w-4 h-4" /> Secure Pipeline</span>
      </footer>
    </div>
  );
}
