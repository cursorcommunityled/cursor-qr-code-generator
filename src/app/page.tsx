'use client';

import { useState, useRef } from 'react';
import { QRCode } from 'react-qrcode-logo';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import { ToastContainer, ToastType } from '@/components/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface QRCodeData {
  id: number;
  url: string;
  isValid: boolean;
  hasWarning: boolean;
  warningMessage?: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

// Security constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_QR_CODES = 750;
const ALLOWED_SCHEMES = ['http:', 'https:'];

// Cursor URL constant
const CURSOR_BASE_URL = 'https://cursor.com/';

// Grid configuration for cut-and-stack collation
const GRID_ROWS = 3;
const GRID_COLS = 3;
const CELLS_PER_PAGE = GRID_ROWS * GRID_COLS;

// Calculate the number for a specific cell position using cut-and-stack collation
function numberForCell(p: number, r: number, c: number, R: number, C: number, N: number): number | null {
  const S = R * C;
  const P = Math.ceil(N / S);
  const s = r * C + c;
  const n = s * P + (p + 1);
  return n <= N ? n : null;
}

function QRCodeGeneratorContent() {
  const [links, setLinks] = useState<string>('');
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'options' | 'upload' | 'manual'>('options');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast management
  const showToast = (message: string, type: ToastType) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Security: Sanitize URL for display (prevent XSS)
  const sanitizeUrlForDisplay = (url: string): string => {
    try {
      // Remove any potential script tags or dangerous content
      const cleaned = url
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/data:/gi, '')
        .replace(/vbscript:/gi, '');
      return cleaned.substring(0, 200); // Limit display length
    } catch {
      return '[Invalid URL]';
    }
  };

  // Security: Validate URL scheme (only allow http/https)
  const isValidUrlScheme = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return ALLOWED_SCHEMES.includes(urlObj.protocol);
    } catch {
      // Try with https prefix
      try {
        const urlObj = new URL(`https://${url}`);
        return ALLOWED_SCHEMES.includes(urlObj.protocol);
      } catch {
        return false;
      }
    }
  };

  // Security: Check for suspicious URL patterns
  const checkSuspiciousUrl = (url: string): { hasWarning: boolean; message?: string } => {
    const suspiciousPatterns = [
      { pattern: /javascript:/i, message: 'JavaScript URLs are not allowed' },
      { pattern: /data:/i, message: 'Data URLs are not allowed' },
      { pattern: /file:/i, message: 'File URLs are not allowed' },
      { pattern: /vbscript:/i, message: 'VBScript URLs are not allowed' },
      { pattern: /<script/i, message: 'Script tags detected in URL' },
      { pattern: /\.\.(\/|\\)/g, message: 'Path traversal detected' },
    ];

    for (const { pattern, message } of suspiciousPatterns) {
      if (pattern.test(url)) {
        return { hasWarning: true, message };
      }
    }

    // Check for non-standard TLDs or suspicious patterns
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Warn about IP addresses (potential phishing)
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        return { hasWarning: true, message: 'Warning: IP address detected (verify source)' };
      }

      // Warn about very long URLs (potential obfuscation)
      if (url.length > 200) {
        return { hasWarning: true, message: 'Warning: Unusually long URL' };
      }
    } catch {
      // Invalid URL format
      return { hasWarning: false };
    }

    return { hasWarning: false };
  };

  const isValidUrl = (url: string): boolean => {
    if (!url || url.trim().length === 0) return false;
    
    // First check scheme
    if (!isValidUrlScheme(url)) {
      return false;
    }

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
    setIsProcessing(true);
    
    try {
      const linkList = links
        .split('\n')
        .map(link => link.trim())
        .filter(link => link.length > 0);

      if (linkList.length === 0) {
        showToast('Please enter at least one URL', 'error');
        setIsProcessing(false);
        return;
      }

      // Security: Check maximum limit
      if (linkList.length > MAX_QR_CODES) {
        showToast(
          `Processing first ${MAX_QR_CODES} of ${linkList.length} URLs (maximum limit).`,
          'warning'
        );
      }

      const limitedList = linkList.slice(0, MAX_QR_CODES);
      let invalidCount = 0;
      let warningCount = 0;

      const qrCodeData: QRCodeData[] = limitedList.map((link, index) => {
        const isValid = isValidUrl(link);
        const normalizedUrl = isValid ? normalizeUrl(link) : link;
        const suspiciousCheck = checkSuspiciousUrl(normalizedUrl);

        if (!isValid) invalidCount++;
        if (suspiciousCheck.hasWarning) warningCount++;

        return {
          id: index + 1,
          url: normalizedUrl,
          isValid,
          hasWarning: suspiciousCheck.hasWarning,
          warningMessage: suspiciousCheck.message,
        };
      });

      setQrCodes(qrCodeData);

      // Show summary toast only for errors/warnings
      if (invalidCount > 0) {
        showToast(
          `Generated ${qrCodeData.length} QR codes with ${invalidCount} invalid URL(s). Invalid URLs will be marked.`,
          'warning'
        );
      } else if (warningCount > 0) {
        showToast(
          `Generated ${qrCodeData.length} QR codes with ${warningCount} warning(s). Please review flagged URLs.`,
          'info'
        );
      }
      // No success toast - cleaner UX
    } catch (error) {
      console.error('Error generating QR codes:', error);
      showToast('Failed to generate QR codes. Please check your input and try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const clearAll = () => {
    setLinks('');
    setQrCodes([]);
    // No toast needed - action is obvious
  };

  const goBack = () => {
    setQrCodes([]);
    setCurrentView('options');
    setLinks('');
  };

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);

    try {
      // Security: Check file size
      if (file.size > MAX_FILE_SIZE) {
        showToast(
          `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed size of 5MB. Please use a smaller file.`,
          'error'
        );
        setIsProcessing(false);
        return;
      }

      // Security: Validate MIME type
      const validMimeTypes = ['text/csv', 'text/plain', 'application/csv'];
      if (!validMimeTypes.includes(file.type) && !file.name.endsWith('.csv')) {
        showToast(
          'Invalid file type. Please upload a valid CSV file (.csv extension, text/csv MIME type).',
          'error'
        );
        setIsProcessing(false);
        return;
      }

      // Read file content
      const text = await file.text();

      // Security: Check for extremely large number of lines
      const lineCount = text.split('\n').length;
      if (lineCount > MAX_QR_CODES + 10) {
        showToast(
          `File contains ${lineCount} lines. Maximum ${MAX_QR_CODES} QR codes will be generated.`,
          'warning'
        );
      }

      // Use PapaParse for proper CSV parsing
      Papa.parse(text, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const urls: string[] = [];
            
            // Extract URLs from CSV, skip header row
            for (let i = 0; i < results.data.length; i++) {
              const row = results.data[i] as string[];
              if (i === 0 && row[0]?.toLowerCase().includes('url')) {
                // Skip header row
                continue;
              }
              
              // Check if this looks like a split Cursor URL format
              let foundReferral = false;
              for (let j = 0; j < row.length; j++) {
                if (row[j] && row[j].trim() && row[j].toLowerCase().startsWith('referral')) {
                  // Found the referral column - build the full URL
                  const referralPath = row[j].trim();
                  const fullUrl = `${CURSOR_BASE_URL}${referralPath}`;
                  urls.push(fullUrl);
                  foundReferral = true;
                  break;
                }
              }
              
              // If we didn't find a referral column, check if it's a standard complete URL
              if (!foundReferral && row[0] && row[0].trim()) {
                const url = row[0].trim();
                // Check if it's already a complete URL (starts with http:// or https://)
                if (url.startsWith('http://') || url.startsWith('https://')) {
                  urls.push(url);
                } else if (url.toLowerCase().startsWith('referral')) {
                  // Just the referral path without base URL
                  urls.push(`${CURSOR_BASE_URL}${url}`);
                } else {
                  // Unknown format, add as-is
                  urls.push(url);
                }
              }
            }

            if (urls.length === 0) {
              showToast(
                'No valid URLs found in the CSV file. Please ensure URLs are in the first column.',
                'error'
              );
              setIsProcessing(false);
              return;
            }

            if (urls.length > MAX_QR_CODES) {
              showToast(
                `Processing first ${MAX_QR_CODES} of ${urls.length} URLs (maximum limit).`,
                'warning'
              );
            }

            setLinks(urls.slice(0, MAX_QR_CODES).join('\n'));
            
            // Auto-generate QR codes
            setTimeout(() => {
              const linkList = urls.slice(0, MAX_QR_CODES);
              let invalidCount = 0;
              let warningCount = 0;

              const qrCodeData: QRCodeData[] = linkList.map((link, index) => {
                const isValid = isValidUrl(link);
                const normalizedUrl = isValid ? normalizeUrl(link) : link;
                const suspiciousCheck = checkSuspiciousUrl(normalizedUrl);

                if (!isValid) invalidCount++;
                if (suspiciousCheck.hasWarning) warningCount++;

                return {
                  id: index + 1,
                  url: normalizedUrl,
                  isValid,
                  hasWarning: suspiciousCheck.hasWarning,
                  warningMessage: suspiciousCheck.message,
                };
              });

              setQrCodes(qrCodeData);
              setIsProcessing(false);

              // Show results only for errors/warnings
              if (invalidCount > 0) {
                showToast(
                  `Processed ${qrCodeData.length} URLs from CSV. ${invalidCount} invalid URL(s) found.`,
                  'warning'
                );
              } else if (warningCount > 0) {
                showToast(
                  `Processed ${qrCodeData.length} URLs with ${warningCount} warning(s).`,
                  'info'
                );
              }
              // No success toast - cleaner UX
            }, 100);
          } catch (error) {
            console.error('Error processing CSV:', error);
            showToast('Failed to process CSV file. Please check the file format and try again.', 'error');
            setIsProcessing(false);
          }
        },
        error: (error: Error) => {
          console.error('CSV parsing error:', error);
          showToast(
            `CSV parsing failed: ${error.message}. Please ensure the file is properly formatted.`,
            'error'
          );
          setIsProcessing(false);
        },
      });
    } catch (error) {
      console.error('File upload error:', error);
      showToast('Failed to read file. Please try again with a different file.', 'error');
      setIsProcessing(false);
    }
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
      
      // Security: Validate file type
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        handleFileUpload(file);
      } else {
        showToast(
          'Invalid file type. Please upload a CSV file (.csv extension).',
          'error'
        );
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
    // Reset input to allow re-uploading the same file
    e.target.value = '';
  };

  // Options View - Choose between Upload or Manual Entry
  const renderOptionsView = () => (
    <motion.div 
      className="flex-1 flex items-center justify-center"
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
          className="text-lg mb-4" 
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
          className={`upload-area border-2 border-dashed rounded-lg p-12 text-center transition-all ${
            dragActive ? 'drag-active' : ''
          } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
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
          {isProcessing ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-t-2" style={{ borderColor: 'var(--accent-blue)' }}></div>
              <p className="text-white font-medium text-lg mt-4">Processing file...</p>
            </motion.div>
          ) : (
            <>
              <motion.div 
                className="mb-4" 
                style={{ color: 'var(--accent-blue)' }}
                animate={{ rotate: dragActive ? 3 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <svg className="mx-auto h-12 w-12" fill="currentColor" viewBox="0 0 24 24">
                  {/* Document outline */}
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" opacity="0.8"/>
                  {/* CSV rows/data lines */}
                  <path d="M8,11H16V12H8V11M8,13H16V14H8V13M8,15H14V16H8V15M8,17H12V18H8V17Z" />
                  {/* File type indicator */}
                  <rect x="7" y="6" width="10" height="2" rx="1" fill="var(--accent-blue)" opacity="0.9"/>
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
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-sm mt-4" style={{ color: 'var(--secondary-text)' }}>
                Max 5MB, up to {MAX_QR_CODES} URLs
              </p>
            </>
          )}
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
          placeholder={`Enter your Cursor referral links, one per line:\n\n${CURSOR_BASE_URL}referral?code=EXAMPLE1\n${CURSOR_BASE_URL}referral?code=EXAMPLE2\n${CURSOR_BASE_URL}referral?code=EXAMPLE3`}
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
            disabled={!links.trim() || isProcessing}
            whileHover={links.trim() && !isProcessing ? { scale: 1.03, y: -1 } : {}}
            whileTap={links.trim() && !isProcessing ? { scale: 0.97 } : {}}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            {isProcessing ? 'Processing...' : 'Generate QR Codes'}
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
          className="flex justify-between items-center mb-4"
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
        
        <motion.p 
          className="text-xs mb-8 text-center px-4 py-2 rounded-lg"
          style={{ color: 'var(--secondary-text)', backgroundColor: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.2)' }}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          💡 Numbers are positioned for easy stacking: after printing, cut pages into squares and stack by position for perfect order
        </motion.p>
        
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
              style={{ 
                background: 'var(--card-background)', 
                border: qr.hasWarning ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid var(--border-color)'
              }}
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
                borderColor: qr.hasWarning ? 'rgba(245, 158, 11, 0.8)' : 'var(--accent-blue)',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
              }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-sm font-medium mb-3" style={{ color: 'var(--accent-blue)' }}>
                #{qr.id}
              </div>
              {qr.hasWarning && (
                <div className="text-xs mb-2 px-2 py-1 rounded" style={{ 
                  backgroundColor: 'rgba(245, 158, 11, 0.2)', 
                  color: '#f59e0b'
                }}>
                  ⚠️ {qr.warningMessage}
                </div>
              )}
              {qr.isValid ? (
                <motion.div
                  className="flex justify-center items-center mb-3"
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <QRCode 
                    value={qr.url} 
                    size={120}
                    bgColor="var(--card-background)"
                    fgColor="white"
                    logoImage="/cropped_circle_image.png"
                    logoWidth={24}
                    logoHeight={24}
                    logoOpacity={1}
                    logoPadding={1}
                    logoPaddingStyle="circle"
                    removeQrCodeBehindLogo={true}
                    qrStyle="squares"
                  />
                </motion.div>
              ) : (
                <div className="w-[120px] h-[120px] mx-auto bg-red-900/20 border border-red-500/50 flex items-center justify-center rounded mb-3">
                  <span className="text-red-400 text-xs">Invalid URL</span>
                </div>
              )}
              <div className="text-xs break-all" style={{ color: 'var(--secondary-text)' }}>
                {sanitizeUrlForDisplay(qr.url).length > 40 
                  ? sanitizeUrlForDisplay(qr.url).substring(0, 40) + '...' 
                  : sanitizeUrlForDisplay(qr.url)}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="min-h-screen" style={{ background: 'var(--background)' }}>
        {/* Screen View */}
        <div className="print:hidden">
          <AnimatePresence mode="wait">
            {qrCodes.length > 0 ? (
              <motion.div key="results">
                {renderResultsView()}
              </motion.div>
            ) : currentView === 'options' ? (
              <motion.div key="options" className="min-h-screen flex flex-col">
                {renderOptionsView()}
                {/* Footer - only on main page */}
                <footer className="mt-auto py-6 px-6 border-t border-gray-800">
                  <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <span>Made with</span>
                      <span className="text-red-400">♥</span>
                      <span>by</span>
                      <a 
                        href="https://github.com/yayaq1" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                      >
                        yayaq1
                      </a>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <a 
                        href="https://github.com/yayaq1/qr-code-generator" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                        </svg>
                        <span>Contribute</span>
                      </a>
                      
                      <a 
                        href="https://cursor.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-purple-400 transition-colors"
                      >
                        Built with Cursor
                      </a>
                    </div>
                  </div>
                </footer>
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
              {Array.from({ length: Math.ceil(qrCodes.length / CELLS_PER_PAGE) }, (_, pageIndex) => {
                // Create a lookup map for QR data by original ID
                const qrLookup = new Map(qrCodes.map(qr => [qr.id, qr]));
                
                return (
                  <div key={pageIndex} className="print-page">
                    <div className="print-grid">
                      {Array.from({ length: GRID_ROWS }, (_, rowIndex) =>
                        Array.from({ length: GRID_COLS }, (_, colIndex) => {
                          const cellNumber = numberForCell(
                            pageIndex, 
                            rowIndex, 
                            colIndex, 
                            GRID_ROWS, 
                            GRID_COLS, 
                            qrCodes.length
                          );
                          
                          if (cellNumber === null) {
                            // Empty cell - maintain grid structure
                            return (
                              <div key={`${rowIndex}-${colIndex}`} className="print-qr-item">
                                <div className="qr-number"></div>
                                <div className="qr-placeholder"></div>
                                <div className="qr-url"></div>
                              </div>
                            );
                          }
                          
                          // Find the QR data for this cell number
                          const qrData = qrLookup.get(cellNumber);
                          if (!qrData) {
                            // Shouldn't happen, but handle gracefully
                            return (
                              <div key={`${rowIndex}-${colIndex}`} className="print-qr-item">
                                <div className="qr-number">#{cellNumber}</div>
                                <div className="qr-error">No data</div>
                                <div className="qr-url"></div>
                              </div>
                            );
                          }
                          
                          return (
                            <div key={`${rowIndex}-${colIndex}`} className="print-qr-item">
                              <div className="qr-number">#{cellNumber}</div>
                              <img src="/LOCKUP_HORIZONTAL_2D_LIGHT.svg" alt="Cursor" className="qr-logo" />
                              {qrData.isValid ? (
                                <QRCode 
                                  value={qrData.url} 
                                  size={180}
                                  bgColor="white"
                                  fgColor="black"
                                  logoImage="/cropped_circle_image.png"
                                  logoWidth={40}
                                  logoHeight={40}
                                  logoOpacity={1}
                                  logoPadding={2}
                                  logoPaddingStyle="circle"
                                  removeQrCodeBehindLogo={true}
                                  qrStyle="squares"
                                />
                              ) : (
                                <div className="qr-error">
                                  Invalid URL
                                </div>
                              )}
                              <div className="qr-url">{sanitizeUrlForDisplay(qrData.url)}</div>
                            </div>
                          );
                        })
                      ).flat()}
                    </div>
                  </div>
                );
              })}
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
              margin: 0mm;
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
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 0;
              background: white;
              box-sizing: border-box;
              position: relative;
            }

            .print-page:last-child {
              page-break-after: avoid;
            }

            .print-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              grid-template-rows: repeat(3, 1fr);
              width: 100%;
              max-width: 210mm;
              height: 100%;
              max-height: 297mm;
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
              position: relative;
            }

            .print-qr-item:nth-child(3n) {
              border-right: 1px solid #000;
            }

            .print-qr-item:nth-child(n+7) {
              border-bottom: 1px solid #000;
            }

            .qr-number {
              position: absolute;
              top: 8px;
              left: 8px;
              font-weight: bold;
              font-size: 14px;
              color: #000;
              z-index: 1;
            }

            .qr-logo {
              position: absolute;
              top: 8px;
              right: 8px;
              width: 75px;
              height: auto;
              opacity: 0.9;
            }

            .qr-code {
              margin: 4px auto;
              display: block;
            }

            .qr-url {
              position: absolute;
              bottom: 8px;
              left: 0;
              right: 0;
              font-size: 8px;
              color: #333;
              line-height: 1.2;
              text-align: center;
              width: 100%;
              padding: 0 8px;
            }

            .qr-error {
              width: 180px;
              height: 180px;
              background: #fee;
              border: 1px solid #fcc;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              color: #c33;
              margin: 4px 0;
            }

            .qr-placeholder {
              width: 180px;
              height: 180px;
              background: transparent;
              margin: 4px 0;
            }
          }
        `}</style>
      </div>
    </>
  );
}

export default function QRCodeGenerator() {
  return (
    <ErrorBoundary>
      <QRCodeGeneratorContent />
    </ErrorBoundary>
  );
}
