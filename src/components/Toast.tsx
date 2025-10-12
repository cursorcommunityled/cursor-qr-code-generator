'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

export type ToastType = 'error' | 'warning' | 'success' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getColors = () => {
    switch (type) {
      case 'error':
        return {
          bg: 'rgba(220, 38, 38, 0.95)',
          border: '#ef4444',
          icon: '❌',
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.95)',
          border: '#f59e0b',
          icon: '⚠️',
        };
      case 'success':
        return {
          bg: 'rgba(34, 197, 94, 0.95)',
          border: '#22c55e',
          icon: '✅',
        };
      case 'info':
        return {
          bg: 'rgba(37, 99, 235, 0.95)',
          border: '#2563eb',
          icon: 'ℹ️',
        };
    }
  };

  const colors = getColors();

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      style={{
        background: colors.bg,
        borderLeft: `4px solid ${colors.border}`,
      }}
      className="fixed top-4 right-4 z-[9999] max-w-md rounded-lg shadow-2xl backdrop-blur-sm"
    >
      <div className="flex items-start gap-3 p-4">
        <span className="text-xl flex-shrink-0">{colors.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium leading-relaxed break-words">
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-white hover:text-gray-200 transition-colors"
          aria-label="Close notification"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      {/* Progress bar */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        style={{ background: colors.border }}
        className="h-1 rounded-bl-lg"
      />
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: ToastType }>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-0 right-0 p-4 z-[9999] pointer-events-none">
      <div className="flex flex-col gap-2 pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => onRemove(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

