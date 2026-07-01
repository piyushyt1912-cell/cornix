'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  /** Timestamp when the toast was created – used internally */
  createdAt: number;
}

interface ToastContextValue {
  showToast: (message: string, variant: ToastVariant) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTO_DISMISS_MS = 4000;
const FADE_OUT_MS = 350;
const ANIMATION_NAME_SLIDE_IN = 'toast-slide-in';
const ANIMATION_NAME_FADE_OUT = 'toast-fade-out';

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `toast-${idCounter}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Variant config (colours & icons)
// ---------------------------------------------------------------------------

interface VariantConfig {
  icon: string;
  lightBg: string;
  lightBorder: string;
  lightText: string;
  darkBg: string;
  darkBorder: string;
  darkText: string;
}

const VARIANT_MAP: Record<ToastVariant, VariantConfig> = {
  success: {
    icon: '✓',
    lightBg: '#f0fdf4',
    lightBorder: '#86efac',
    lightText: '#166534',
    darkBg: '#14532d',
    darkBorder: '#22c55e',
    darkText: '#bbf7d0',
  },
  error: {
    icon: '✕',
    lightBg: '#fef2f2',
    lightBorder: '#fca5a5',
    lightText: '#991b1b',
    darkBg: '#7f1d1d',
    darkBorder: '#ef4444',
    darkText: '#fecaca',
  },
  warning: {
    icon: '⚠',
    lightBg: '#fffbeb',
    lightBorder: '#fcd34d',
    lightText: '#92400e',
    darkBg: '#78350f',
    darkBorder: '#f59e0b',
    darkText: '#fde68a',
  },
  info: {
    icon: 'ℹ',
    lightBg: '#eff6ff',
    lightBorder: '#93c5fd',
    lightText: '#1e40af',
    darkBg: '#1e3a5f',
    darkBorder: '#3b82f6',
    darkText: '#bfdbfe',
  },
};

// ---------------------------------------------------------------------------
// Keyframe injection (runs once)
// ---------------------------------------------------------------------------

let stylesInjected = false;

function injectKeyframes(): void {
  if (stylesInjected) return;
  if (typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes ${ANIMATION_NAME_SLIDE_IN} {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    @keyframes ${ANIMATION_NAME_FADE_OUT} {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(40%);
      }
    }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast() must be used within a <ToastContainer /> provider.');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Individual toast item
// ---------------------------------------------------------------------------

interface ToastItemProps {
  toast: Toast;
  isLightMode: boolean;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, isLightMode, onDismiss }: ToastItemProps) {
  const [fadingOut, setFadingOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (fadingOut) return;
    setFadingOut(true);
    fadeTimerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, FADE_OUT_MS);
  }, [fadingOut, onDismiss, toast.id]);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      dismiss();
    }, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cfg = VARIANT_MAP[toast.variant];
  const bg = isLightMode ? cfg.lightBg : cfg.darkBg;
  const border = isLightMode ? cfg.lightBorder : cfg.darkBorder;
  const text = isLightMode ? cfg.lightText : cfg.darkText;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 16px',
    borderRadius: '8px',
    border: `1px solid ${border}`,
    backgroundColor: bg,
    color: text,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: '14px',
    lineHeight: '1.5',
    boxShadow: isLightMode
      ? '0 4px 12px rgba(0, 0, 0, 0.1)'
      : '0 4px 12px rgba(0, 0, 0, 0.4)',
    pointerEvents: 'auto' as const,
    animation: fadingOut
      ? `${ANIMATION_NAME_FADE_OUT} ${FADE_OUT_MS}ms ease-in forwards`
      : `${ANIMATION_NAME_SLIDE_IN} 300ms ease-out`,
    maxWidth: '380px',
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  const iconStyle: React.CSSProperties = {
    flexShrink: 0,
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700,
    borderRadius: '50%',
    backgroundColor: border,
    color: isLightMode ? cfg.lightBg : cfg.darkBg,
  };

  const messageStyle: React.CSSProperties = {
    flex: 1,
    margin: 0,
    padding: 0,
    wordBreak: 'break-word' as const,
  };

  const closeButtonStyle: React.CSSProperties = {
    flexShrink: 0,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: text,
    fontSize: '16px',
    lineHeight: 1,
    padding: '2px',
    opacity: 0.7,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div role="alert" aria-live="assertive" style={containerStyle}>
      <span style={iconStyle} aria-hidden="true">
        {cfg.icon}
      </span>
      <span style={messageStyle}>{toast.message}</span>
      <button
        type="button"
        onClick={dismiss}
        style={closeButtonStyle}
        aria-label="Dismiss notification"
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '0.7';
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ToastContainer — provider + render
// ---------------------------------------------------------------------------

interface ToastContainerProps {
  children: ReactNode;
  isLightMode?: boolean;
}

export function ToastContainer({ children, isLightMode = true }: ToastContainerProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    injectKeyframes();
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant) => {
    const id = nextId();
    setToasts((prev) => [...prev, { id, message, variant, createdAt: Date.now() }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const portalStyle: React.CSSProperties = {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    pointerEvents: 'none',
    maxHeight: 'calc(100vh - 32px)',
    overflowY: 'auto',
    overflowX: 'hidden',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={portalStyle} aria-label="Notifications">
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            isLightMode={isLightMode}
            onDismiss={dismissToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
