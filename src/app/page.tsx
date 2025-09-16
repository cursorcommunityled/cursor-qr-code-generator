'use client';

import { useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'framer-motion';

interface QRCodeData {
  id: number;
  url: string;
  isValid: boolean;
}

export default function QRCodeGenerator() {
  const [links, setLinks] = useState<string>('');
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'options' | 'upload' | 'manual'>('options');
  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      // If it doesn't start with http/https, try adding https://
      try {
        new URL(`https://${url}`);
        return true;
      } catch {
        return false;
      }
    }
  };

  const normalizeUrl = (url: string): string => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  const generateQRCodes = () => {
    const linkList = links
      .split('\n')
      .map(link => link.trim())
      .filter(link => link.length > 0);

    const qrCodeData: QRCodeData[] = linkList.map((link, index) => ({
      id: index + 1,
      url: normalizeUrl(link),
      isValid: isValidUrl(link)
    }));

    setQrCodes(qrCodeData);
  };

  const handlePrint = () => {
    // Don't navigate away after printing - let user stay on results page
    window.print();
  };

  const clearAll = () => {
    setLinks('');
    setQrCodes([]);
  };

  const goBack = () => {
    setQrCodes([]);
    setCurrentView('options');
    setLinks('');
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        // Parse CSV - assuming first column contains URLs
        const lines = text.split('\n');
        const urls = lines
          .slice(1) // Skip header row
          .map(line => line.split(',')[0].trim())
          .filter(url => url.length > 0 && url !== 'codes');
        
        if (urls.length > 0) {
          setLinks(urls.join('\n'));
          // Auto-generate QR codes after successful upload
          setTimeout(() => {
            const linkList = urls.filter(link => link.length > 0);
            const qrCodeData: QRCodeData[] = linkList.map((link, index) => ({
              id: index + 1,
              url: normalizeUrl(link),
              isValid: isValidUrl(link)
            }));
            setQrCodes(qrCodeData);
          }, 100);
        } else {
          alert('No valid URLs found in the CSV file. Please check the format.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        handleFileUpload(file);
      } else {
        alert('Please upload a CSV file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Options View - Choose between Upload or Manual Entry
  const renderOptionsView = () => (
    <motion.div 
      className="min-h-screen flex items-center justify-center" 
      style={{ background: 'var(--background)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center max-w-lg mx-auto px-6">
        <motion.h1 
          className="headline text-4xl font-bold text-white mb-4"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          <span style={{ color: 'var(--accent-blue)' }}>Cursor Credits</span> QR Code Generator
        </motion.h1>
        <motion.p 
          className="text-lg mb-12" 
          style={{ color: 'var(--secondary-text)' }}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          Generate QR codes for your referral links
        </motion.p>
        
        <motion.div 
          className="space-y-4"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.15 }}
        >
          <motion.button
            onClick={() => setCurrentView('upload')}
            className="btn-primary w-full py-4 px-6 rounded-lg text-lg font-medium"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            Upload CSV File
          </motion.button>
          
          <motion.button
            onClick={() => setCurrentView('manual')}
            className="btn-secondary w-full py-4 px-6 rounded-lg text-lg font-medium"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            Enter Links Manually
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );

  // Upload View - File Upload Interface
  const renderUploadView = () => (
    <motion.div 
      className="min-h-screen" 
      style={{ background: 'var(--background)' }}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <motion.button
          onClick={goBack}
          className="mb-6 text-sm" 
          style={{ color: 'var(--secondary-text)' }}
          whileHover={{ x: -3, color: 'var(--accent-blue)' }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        >
          ← Back
        </motion.button>
        
        <motion.h2 
          className="text-2xl font-semibold text-white mb-8"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          Upload CSV File
        </motion.h2>
        
        <motion.div 
          className={`upload-area border-2 border-dashed rounded-lg p-12 text-center ${
            dragActive ? 'drag-active' : ''
          }`}
          style={{ borderColor: 'var(--border-color)' }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          whileHover={{ scale: 1.01, borderColor: 'var(--accent-blue)' }}
        >
          <motion.div 
            className="mb-4" 
            style={{ color: 'var(--accent-blue)' }}
            animate={{ rotate: dragActive ? 3 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
          <p className="text-white font-medium text-lg mb-2">Drop CSV file here</p>
          <p className="mb-6" style={{ color: 'var(--secondary-text)' }}>or</p>
          <motion.button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary px-8 py-3 rounded-lg font-medium"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            Choose File
          </motion.button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <p className="text-sm mt-4" style={{ color: 'var(--secondary-text)' }}>
            CSV files with links in the first column
          </p>
        </motion.div>
      </div>
    </motion.div>
  );

  // Manual Entry View
  const renderManualView = () => (
    <motion.div 
      className="min-h-screen" 
      style={{ background: 'var(--background)' }}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <motion.button
          onClick={goBack}
          className="mb-6 text-sm"
          style={{ color: 'var(--secondary-text)' }}
          whileHover={{ x: -3, color: 'var(--accent-blue)' }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        >
          ← Back
        </motion.button>
        
        <motion.h2 
          className="text-2xl font-semibold text-white mb-8"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          Enter Links
        </motion.h2>
        
        <motion.textarea
          className="w-full h-64 p-4 rounded-lg resize-none text-white"
          style={{ 
            background: 'var(--card-background)', 
            border: '1px solid var(--border-color)'
          }}
          placeholder="Enter your Cursor referral links, one per line:

https://cursor.com/referral?code=EXAMPLE1
https://cursor.com/referral?code=EXAMPLE2
https://cursor.com/referral?code=EXAMPLE3"
          value={links}
          onChange={(e) => setLinks(e.target.value)}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          whileFocus={{ scale: 1.01, borderColor: 'var(--accent-blue)' }}
        />
        
        <motion.div 
          className="flex gap-4 mt-6"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.15 }}
        >
          <motion.button
            onClick={generateQRCodes}
            className={`px-8 py-3 rounded-lg font-medium ${links.trim() ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
            disabled={!links.trim()}
            whileHover={links.trim() ? { scale: 1.03, y: -1 } : {}}
            whileTap={links.trim() ? { scale: 0.97 } : {}}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            Generate QR Codes
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );

  // QR Codes Results View
  const renderResultsView = () => (
    <motion.div 
      className="min-h-screen" 
      style={{ background: 'var(--background)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <motion.button
          onClick={goBack}
          className="mb-6 text-sm"
          style={{ color: 'var(--secondary-text)' }}
          whileHover={{ x: -3, color: 'var(--accent-blue)' }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        >
          ← Back
        </motion.button>
        
        <motion.div 
          className="flex justify-between items-center mb-8"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          <h2 className="text-2xl font-semibold text-white">
            QR Codes ({qrCodes.length})
          </h2>
          
          <div className="flex gap-3">
            <motion.button
              onClick={handlePrint}
              className="btn-secondary px-6 py-2 rounded-lg text-sm font-medium"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              Print
            </motion.button>
            <motion.button
              onClick={clearAll}
              className="btn-secondary px-6 py-2 rounded-lg text-sm font-medium"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              Clear
            </motion.button>
          </div>
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          {qrCodes.map((qr, index) => (
            <motion.div 
              key={qr.id} 
              className="qr-item rounded-lg p-4 text-center" 
              style={{ background: 'var(--card-background)', border: '1px solid var(--border-color)' }}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                duration: 0.15, 
                delay: index * 0.02,
                type: "spring",
                stiffness: 500,
                damping: 25
              }}
              whileHover={{ 
                scale: 1.02, 
                y: -2,
                borderColor: 'var(--accent-blue)',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
              }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-sm font-medium mb-3" style={{ color: 'var(--accent-blue)' }}>
                #{qr.id}
              </div>
              {qr.isValid ? (
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <QRCode 
                    value={qr.url} 
                    size={120}
                    className="mx-auto mb-3"
                    bgColor="var(--card-background)"
                    fgColor="white"
                  />
                </motion.div>
              ) : (
                <div className="w-[120px] h-[120px] mx-auto bg-red-900/20 border border-red-500/50 flex items-center justify-center rounded mb-3">
                  <span className="text-red-400 text-xs">Invalid</span>
                </div>
              )}
              <div className="text-xs break-all" style={{ color: 'var(--secondary-text)' }}>
                {qr.url.length > 40 ? qr.url.substring(0, 40) + '...' : qr.url}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Screen View */}
      <div className="print:hidden">
        <AnimatePresence mode="wait">
          {qrCodes.length > 0 ? (
            <motion.div key="results">
              {renderResultsView()}
            </motion.div>
          ) : currentView === 'options' ? (
            <motion.div key="options">
              {renderOptionsView()}
            </motion.div>
          ) : currentView === 'upload' ? (
            <motion.div key="upload">
              {renderUploadView()}
            </motion.div>
          ) : (
            <motion.div key="manual">
              {renderManualView()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Print View */}
      <div ref={printRef} className="hidden print:block">
        {qrCodes.length > 0 && (
          <div className="print-container">
            {Array.from({ length: Math.ceil(qrCodes.length / 9) }, (_, pageIndex) => (
              <div key={pageIndex} className="print-page">
                <div className="print-grid">
                  {qrCodes
                    .slice(pageIndex * 9, (pageIndex + 1) * 9)
                    .map((qr) => (
                      <div key={qr.id} className="print-qr-item">
                        <div className="qr-number">#{qr.id}</div>
                        {qr.isValid ? (
                          <QRCode 
                            value={qr.url} 
                            size={140}
                            className="qr-code"
                            bgColor="white"
                            fgColor="black"
                          />
                        ) : (
                          <div className="qr-error">
                            Invalid URL
                          </div>
                        )}
                        <div className="qr-url">{qr.url}</div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          @page {
            size: A4;
            margin: 10mm;
          }

          .print-container {
            width: 100%;
            height: 100%;
            background: white;
          }

          .print-page {
            page-break-after: always;
            width: 100%;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
          }

          .print-page:last-child {
            page-break-after: avoid;
          }

          .print-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(3, 1fr);
            width: 100%;
            height: 90%;
            max-width: 190mm;
            max-height: 260mm;
            border: 1px solid #000;
            box-sizing: border-box;
          }

          .print-qr-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 8px;
            text-align: center;
            background: white;
            border-right: 1px solid #000;
            border-bottom: 1px solid #000;
            box-sizing: border-box;
          }

          .print-qr-item:nth-child(3n) {
            border-right: 1px solid #000;
          }

          .print-qr-item:nth-child(n+7) {
            border-bottom: 1px solid #000;
          }

          .qr-number {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 4px;
            color: #000;
          }

          .qr-code {
            margin: 4px 0;
          }

          .qr-url {
            font-size: 7px;
            color: #333;
            word-break: break-all;
            margin-top: 4px;
            max-width: 140px;
            line-height: 1.1;
          }

          .qr-error {
            width: 140px;
            height: 140px;
            background: #fee;
            border: 1px solid #fcc;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #c33;
            margin: 4px 0;
          }
        }
      `}</style>
    </div>
  );
}