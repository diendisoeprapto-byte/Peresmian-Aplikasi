/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { motion, MotionConfig } from 'motion/react';
import { Settings, RotateCcw, ExternalLink } from 'lucide-react';
import { BiometricScanner, ScanStatus } from './components/BiometricScanner';
import { SettingsModal } from './components/SettingsModal';
import { biometricAudio } from './utils/biometricAudio';
import { CeremonyConfig, ConnectionMode } from './utils/singleFileGenerator';

// ============================================================================
// KONFIGURASI UTAMA SEREMONI PERESMIAN
// ============================================================================
const URL_WEB_SEKOLAH = 'https://rbu21sekolah.netlify.app/';
const MODE_KONEKSI: ConnectionMode = 'iframe'; // Pilihan: 'iframe' | 'redirect'
const DURASI_TAHAN_MS = 3000; // 3 detik sentuh & tahan
const JEDA_TRANSISI_MS = 2000; // 2 detik jeda setelah 100% sebelum tampil web

const STORAGE_KEY = 'sekolahku_ceremony_config_v1';

function loadInitialConfig(): CeremonyConfig {
  const defaults: CeremonyConfig = {
    schoolUrl: URL_WEB_SEKOLAH,
    mode: MODE_KONEKSI,
    redirectNewTab: false,
    subtitle: 'Transformasi Ekosistem Pendidikan Digital',
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<CeremonyConfig>;
    return {
      schoolUrl:
        typeof parsed.schoolUrl === 'string' && parsed.schoolUrl.trim()
          ? parsed.schoolUrl.trim()
          : defaults.schoolUrl,
      mode: parsed.mode === 'redirect' ? 'redirect' : 'iframe',
      redirectNewTab: Boolean(parsed.redirectNewTab),
      subtitle:
        typeof parsed.subtitle === 'string' && parsed.subtitle.trim()
          ? parsed.subtitle.trim()
          : defaults.subtitle,
    };
  } catch {
    return defaults;
  }
}

export default function App() {
  const [config, setConfig] = useState<CeremonyConfig>(loadInitialConfig);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [redirectBlockedFallback, setRedirectBlockedFallback] = useState<boolean>(false);

  const rafIdRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const holdStartRef = useRef<number>(0);
  const statusRef = useRef<ScanStatus>('idle');
  const configRef = useRef<CeremonyConfig>(config);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const cleanupTimers = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupTimers();
      biometricAudio.cancelScan();
    };
  }, [cleanupTimers]);

  const fireInaugurationConfetti = useCallback(() => {
    const palette = ['#38BDF8', '#10B981', '#FBBF24', '#F8FAFC', '#0EA5E9'];

    confetti({
      particleCount: 95,
      spread: 80,
      startVelocity: 46,
      origin: { x: 0.5, y: 0.56 },
      colors: palette,
      disableForReducedMotion: true,
    });

    window.setTimeout(() => {
      confetti({
        particleCount: 55,
        angle: 60,
        spread: 60,
        startVelocity: 42,
        origin: { x: 0.08, y: 0.68 },
        colors: palette,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 55,
        angle: 120,
        spread: 60,
        startVelocity: 42,
        origin: { x: 0.92, y: 0.68 },
        colors: palette,
        disableForReducedMotion: true,
      });
    }, 220);
  }, []);

  const triggerActivationSuccess = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    statusRef.current = 'activated';
    setStatus('activated');
    setProgress(100);
    setHintMessage(null);

    biometricAudio.playSuccess();
    fireInaugurationConfetti();

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([45, 35, 110]);
      } catch {
        // Ignore if unsupported
      }
    }

    transitionTimerRef.current = window.setTimeout(() => {
      const currentConfig = configRef.current;
      if (currentConfig.mode === 'redirect') {
        if (currentConfig.redirectNewTab) {
          const opened = window.open(currentConfig.schoolUrl, '_blank', 'noopener,noreferrer');
          if (!opened) {
            setRedirectBlockedFallback(true);
          }
          statusRef.current = 'connected';
          setStatus('connected');
        } else {
          statusRef.current = 'connected';
          setStatus('connected');
          window.location.href = currentConfig.schoolUrl;
        }
      } else {
        statusRef.current = 'connected';
        setStatus('connected');
      }
    }, JEDA_TRANSISI_MS);
  }, [fireInaugurationConfetti]);

  const handleStartHold = useCallback(() => {
    if (statusRef.current === 'activated' || statusRef.current === 'connected') return;

    biometricAudio.unlock();
    biometricAudio.startScan();

    statusRef.current = 'scanning';
    setStatus('scanning');
    setHintMessage(null);
    setRedirectBlockedFallback(false);
    holdStartRef.current = performance.now();

    const step = (now: number) => {
      if (statusRef.current !== 'scanning') return;
      const elapsed = now - holdStartRef.current;
      const ratio = Math.min(1, elapsed / DURASI_TAHAN_MS);
      const pct = ratio * 100;

      setProgress(pct);
      biometricAudio.updateProgress(ratio);

      if (ratio >= 1) {
        triggerActivationSuccess();
        return;
      }

      rafIdRef.current = requestAnimationFrame(step);
    };

    rafIdRef.current = requestAnimationFrame(step);
  }, [triggerActivationSuccess]);

  const handleEndHold = useCallback(() => {
    if (statusRef.current !== 'scanning') return;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    biometricAudio.cancelScan();
    statusRef.current = 'idle';
    setStatus('idle');
    setProgress(0);
    setHintMessage('Tahan selama 3 detik penuh hingga mencapai 100%');
  }, []);

  const handleResetCeremony = useCallback(() => {
    cleanupTimers();
    biometricAudio.cancelScan();
    statusRef.current = 'idle';
    setStatus('idle');
    setProgress(0);
    setHintMessage(null);
    setRedirectBlockedFallback(false);
  }, [cleanupTimers]);

  const handleSaveConfig = useCallback((nextConfig: CeremonyConfig) => {
    setConfig(nextConfig);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextConfig));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const isConnectedIframe = status === 'connected' && config.mode === 'iframe';
  const isConnectedRedirect = status === 'connected' && config.mode === 'redirect';

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-screen w-screen overflow-hidden bg-[#040814] text-slate-100">
      {/* Subtle Top-Right Settings Trigger (Visible on Ceremony Screen) */}
      {!isConnectedIframe && (
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          aria-label="Pengaturan URL Web Aplikasi Sekolahku"
          title="Pengaturan Seremoni"
          className="fixed right-5 top-5 z-30 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800/90 bg-[#0B1224]/80 text-slate-400 backdrop-blur-md transition-colors duration-200 hover:border-sky-400/50 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <Settings className="h-5 w-5" />
        </button>
      )}

      {/* Futuristic Inauguration Stage */}
      <main
        className={`relative z-10 flex h-full w-full flex-col items-center justify-center px-6 py-8 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isConnectedIframe
            ? 'pointer-events-none scale-105 opacity-0'
            : 'pointer-events-auto scale-100 opacity-100'
        }`}
        style={{
          background:
            'radial-gradient(circle at 50% 46%, rgba(14, 165, 233, 0.13) 0%, rgba(7, 15, 34, 0.45) 45%, #040814 82%)',
        }}
      >
        {/* Architectural Cyber Grid Backdrop */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(56, 189, 248, 0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.045) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(circle at 50% 50%, black 18%, transparent 74%)',
            WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 18%, transparent 74%)',
          }}
        />

        {/* Ceremonial Header */}
        <motion.header
          initial={{ opacity: 0, scale: 0.94, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 mb-6 max-w-3xl text-center sm:mb-8"
        >
          <p className="mb-2.5 text-sm font-medium tracking-wide text-sky-300/90 sm:text-base">
            {config.subtitle}
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-50 [text-wrap:balance] sm:text-5xl">
            Peresmian Digital Aplikasi Sekolahku
          </h1>
        </motion.header>

        {/* Central Interactive Biometric Palm & Fingerprint Scanner */}
        <motion.section
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.75, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex flex-col items-center justify-center"
        >
          <BiometricScanner
            status={status}
            progress={progress}
            hintMessage={hintMessage}
            onStartHold={handleStartHold}
            onEndHold={handleEndHold}
          />
        </motion.section>

        {/* Redirect Fallback Banner if Browser Blocks Popup / Auto-Redirect */}
        {isConnectedRedirect && (
          <div className="relative z-20 mt-4 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-slate-300">
              {redirectBlockedFallback
                ? 'Browser menahan pembukaan tab otomatis. Klik tombol di bawah untuk membuka Aplikasi Sekolahku.'
                : 'Mengarahkan ke Aplikasi Sekolahku...'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href={config.schoolUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                <ExternalLink className="h-4 w-4" />
                Buka Aplikasi Sekolahku
              </a>
              <button
                type="button"
                onClick={handleResetCeremony}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500"
              >
                <RotateCcw className="h-4 w-4" />
                Ulangi Seremoni
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Mode Iframe Fullscreen (100vw x 100vh) */}
      <section
        aria-hidden={!isConnectedIframe}
        className={`fixed inset-0 z-20 h-screen w-screen bg-white transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isConnectedIframe
            ? 'pointer-events-auto scale-100 opacity-100'
            : 'pointer-events-none scale-[0.98] opacity-0'
        }`}
      >
        {isConnectedIframe && (
          <iframe
            src={config.schoolUrl}
            title="Aplikasi Sekolahku"
            className="block h-screen w-screen border-0"
            allow="fullscreen; camera; microphone; geolocation"
          />
        )}

        {/* Discreet Corner Control for MC / Operator in Fullscreen Iframe Mode */}
        {isConnectedIframe && (
          <div className="fixed bottom-4 right-4 z-30 flex items-center gap-2 opacity-35 transition-opacity duration-200 hover:opacity-100 focus-within:opacity-100">
            <a
              href={config.schoolUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Buka di tab baru jika tampilan terblokir"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-700/70 bg-slate-950/85 px-3.5 py-2 text-xs font-medium text-slate-100 backdrop-blur-md transition-colors hover:border-sky-400 hover:bg-slate-900 whitespace-nowrap"
            >
              <ExternalLink className="h-3.5 w-3.5 text-sky-400" />
              Buka Tab Baru
            </a>
            <button
              type="button"
              onClick={handleResetCeremony}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-700/70 bg-slate-950/85 px-3.5 py-2 text-xs font-medium text-slate-100 backdrop-blur-md transition-colors hover:border-sky-400 hover:bg-slate-900 whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5 text-sky-400" />
              Ulangi Seremoni
            </button>
          </div>
        )}
      </section>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        config={config}
        defaultUrl={URL_WEB_SEKOLAH}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveConfig}
        onResetCeremony={handleResetCeremony}
      />
      </div>
    </MotionConfig>
  );
}
