import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Copy, Check, Scissors, Palette, Code, FileCode, Zap } from 'lucide-react';
import { optimizeSVG, convertToReactComponent, convertToTailwindConfig, getFileSize, formatFileSize } from './utils/svgOptimizer';

function App() {
  const [inputSvg, setInputSvg] = useState('');
  const [outputSvg, setOutputSvg] = useState('');
  const [originalSize, setOriginalSize] = useState(0);
  const [optimizedSize, setOptimizedSize] = useState(0);
  const [activeTab, setActiveTab] = useState('clean');
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [options, setOptions] = useState({
    removeDimensions: false,
    replaceFill: false,
    minify: true,
    prettify: false
  });

  const [reactComponent, setReactComponent] = useState('');
  const [tailwindConfig, setTailwindConfig] = useState(null);

  const processSvg = useCallback((svgContent) => {
    if (!svgContent.trim()) {
      setOutputSvg('');
      setReactComponent('');
      setTailwindConfig(null);
      setOriginalSize(0);
      setOptimizedSize(0);
      return;
    }

    try {
      const originalSize = getFileSize(svgContent);
      const optimized = optimizeSVG(svgContent, options);
      const optimizedSize = getFileSize(optimized);
      
      setOutputSvg(optimized);
      setReactComponent(convertToReactComponent(optimized));
      setTailwindConfig(convertToTailwindConfig(optimized));
      setOriginalSize(originalSize);
      setOptimizedSize(optimizedSize);
    } catch (error) {
      console.error('SVG processing error:', error);
      setOutputSvg(`Error: ${error.message}`);
      setReactComponent('');
      setTailwindConfig(null);
    }
  }, [options]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      processSvg(inputSvg);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [inputSvg, processSvg]);

  const handleInputChange = (e) => {
    setInputSvg(e.target.value);
  };

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const svgFile = files.find(file => file.type === 'image/svg+xml' || file.name.endsWith('.svg'));

    if (svgFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setInputSvg(event.target.result);
      };
      reader.readAsText(svgFile);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleOptionChange = (option) => {
    setOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const copyToClipboard = useCallback(async () => {
    let content = '';
    switch (activeTab) {
      case 'clean':
        content = outputSvg;
        break;
      case 'react':
        content = reactComponent;
        break;
      case 'tailwind':
        content = JSON.stringify(tailwindConfig, null, 2);
        break;
    }

    if (content) {
      try {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  }, [outputSvg, reactComponent, tailwindConfig, activeTab]);

  const sizeReduction = originalSize > 0 ? Math.round(((originalSize - optimizedSize) / originalSize) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">SVG Surgical Cleaner</h1>
              <p className="text-sm text-gray-400">Production-ready SVG optimization</p>
            </div>
          </div>
          
          {originalSize > 0 && (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-400">Size reduction</div>
                <div className="text-lg font-semibold text-green-400">{sizeReduction}%</div>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-gray-400">{formatFileSize(originalSize)}</span>
                <span className="text-gray-600">→</span>
                <span className="text-green-400 font-medium">{formatFileSize(optimizedSize)}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - Input */}
        <div className="w-1/2 border-r border-gray-700 flex flex-col">
          {/* Input Header */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Upload className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium">Input SVG</span>
            </div>
            <label className="cursor-pointer text-blue-400 hover:text-blue-300 text-sm">
              Browse File
              <input
                type="file"
                accept=".svg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => setInputSvg(event.target.result);
                    reader.readAsText(file);
                  }
                }}
              />
            </label>
          </div>

          {/* Surgical Options */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.removeDimensions}
                  onChange={() => handleOptionChange('removeDimensions')}
                  className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Remove dimensions</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.replaceFill}
                  onChange={() => handleOptionChange('replaceFill')}
                  className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Replace fill with currentColor</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.minify}
                  onChange={() => handleOptionChange('minify')}
                  className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Minify</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.prettify}
                  onChange={() => handleOptionChange('prettify')}
                  className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Prettify</span>
              </label>
            </div>
          </div>

          {/* Input Area */}
          <div
            className={`flex-1 relative ${isDragging ? 'bg-gray-700' : ''}`}
            onDrop={handleFileDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {isDragging && (
              <div className="absolute inset-0 bg-blue-600 bg-opacity-20 border-2 border-dashed border-blue-400 flex items-center justify-center z-10">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                  <p className="text-blue-400 font-medium">Drop SVG file here</p>
                </div>
              </div>
            )}
            
            <textarea
              value={inputSvg}
              onChange={handleInputChange}
              placeholder="Paste your SVG code here or drag & drop an SVG file..."
              className="w-full h-full bg-transparent border-none outline-none resize-none p-4 font-mono text-sm placeholder-gray-500"
            />
          </div>
        </div>

        {/* Right Panel - Output */}
        <div className="w-1/2 flex flex-col">
          {/* Output Header */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('clean')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeTab === 'clean'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                }`}
              >
                <Code className="w-4 h-4 inline mr-1" />
                Clean SVG
              </button>
              <button
                onClick={() => setActiveTab('react')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeTab === 'react'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                }`}
              >
                <FileCode className="w-4 h-4 inline mr-1" />
                React Component
              </button>
              <button
                onClick={() => setActiveTab('tailwind')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeTab === 'tailwind'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                }`}
              >
                <Palette className="w-4 h-4 inline mr-1" />
                Tailwind Config
              </button>
            </div>
            
            <button
              onClick={copyToClipboard}
              className="flex items-center space-x-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Output Content */}
          <div className="flex-1 relative">
            <textarea
              value={
                activeTab === 'clean' ? outputSvg :
                activeTab === 'react' ? reactComponent :
                tailwindConfig ? JSON.stringify(tailwindConfig, null, 2) : ''
              }
              readOnly
              className="w-full h-full bg-transparent border-none outline-none resize-none p-4 font-mono text-sm text-gray-300"
              placeholder="Optimized output will appear here..."
            />
          </div>

          {/* Preview */}
          <div className="border-t border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium">Live Preview</span>
              </div>
            </div>
            
            <div className="checkerboard-bg bg-gray-800 rounded-lg p-8 flex items-center justify-center min-h-[120px]">
              {outputSvg ? (
                <div
                  dangerouslySetInnerHTML={{ __html: outputSvg }}
                  className="max-w-full max-h-full"
                  style={{ width: '64px', height: '64px' }}
                />
              ) : (
                <div className="text-gray-500 text-sm">Preview will appear here</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;