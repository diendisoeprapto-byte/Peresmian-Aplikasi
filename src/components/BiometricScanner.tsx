import React, { useRef, useEffect, useCallback } from 'react';
import { FrequencyVisualizer } from './FrequencyVisualizer';

export type ScanStatus = 'idle' | 'scanning' | 'activated' | 'connected';

interface BiometricScannerProps {
  status: ScanStatus;
  progress: number; // 0 to 100
  hintMessage?: string | null;
  onStartHold: () => void;
  onEndHold: () => void;
}

const RING_RADIUS = 150;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const BiometricScanner: React.FC<BiometricScannerProps> = ({
  status,
  progress,
  hintMessage,
  onStartHold,
  onEndHold,
}) => {
  const isHoldingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);

  const isActivated = status === 'activated' || status === 'connected';
  const isScanning = status === 'scanning';

  const strokeDashoffset =
    RING_CIRCUMFERENCE - (Math.min(100, Math.max(0, progress)) / 100) * RING_CIRCUMFERENCE;

  const beginHold = useCallback(() => {
    if (isActivated || isHoldingRef.current) return;
    isHoldingRef.current = true;
    onStartHold();
  }, [isActivated, onStartHold]);

  const finishHold = useCallback(() => {
    if (!isHoldingRef.current) return;
    isHoldingRef.current = false;
    activePointerIdRef.current = null;
    onEndHold();
  }, [onEndHold]);

  useEffect(() => {
    if (isActivated) {
      isHoldingRef.current = false;
      activePointerIdRef.current = null;
    }
  }, [isActivated]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (isActivated) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
      activePointerIdRef.current = e.pointerId;
    } catch {
      // Fallback if pointer capture isn't supported
    }
    beginHold();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
    finishHold();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (!e.repeat) {
        beginHold();
      }
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      finishHold();
    }
  };

  const accentHex = isActivated ? '#10B981' : '#38BDF8';
  const accentSoftHex = isActivated ? '#34D399' : '#0EA5E9';

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Ambient Radial Aura */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div
          className="h-[340px] w-[340px] sm:h-[420px] sm:w-[420px] rounded-full blur-3xl transition-all duration-500"
          style={{
            background: isActivated
              ? 'radial-gradient(circle, rgba(16,185,129,0.28) 0%, rgba(16,185,129,0.06) 50%, transparent 72%)'
              : isScanning
              ? 'radial-gradient(circle, rgba(56,189,248,0.32) 0%, rgba(14,165,233,0.08) 52%, transparent 74%)'
              : 'radial-gradient(circle, rgba(14,165,233,0.18) 0%, rgba(14,165,233,0.03) 50%, transparent 72%)',
          }}
        />
      </div>

      {/* Main Interactive Scanner Button */}
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onBlur={finishHold}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onContextMenu={(e) => e.preventDefault()}
        disabled={isActivated}
        aria-label="Pemindai Biometrik Telapak Tangan dan Sidik Jari. Sentuh dan tahan selama 3 detik untuk mengaktifkan Aplikasi Sekolahku."
        className={`group relative flex items-center justify-center rounded-full touch-none select-none outline-none transition-transform duration-200 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-4 focus-visible:ring-offset-[#040814] ${
          isActivated
            ? 'cursor-default scale-[1.03]'
            : isScanning
            ? 'cursor-grabbing scale-[0.985]'
            : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
        }`}
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
      >
        <FrequencyVisualizer status={status} progress={progress} />

        <svg
          viewBox="0 0 340 340"
          className="relative z-10 h-[290px] w-[290px] sm:h-[340px] sm:w-[340px] overflow-visible"
        >
          <defs>
            {/* Circular Clip for Palm + Laser Sweep */}
            <clipPath id="scanner-inner-clip">
              <circle cx="170" cy="170" r="134" />
            </clipPath>

            {/* Glowing Filter */}
            <filter id="biometric-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Laser Beam Gradient */}
            <linearGradient id="laser-beam-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={accentHex} stopOpacity="0" />
              <stop offset="18%" stopColor={accentHex} stopOpacity="0.85" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="82%" stopColor={accentHex} stopOpacity="0.85" />
              <stop offset="100%" stopColor={accentHex} stopOpacity="0" />
            </linearGradient>

            <linearGradient id="laser-trail-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accentHex} stopOpacity="0" />
              <stop offset="50%" stopColor={accentHex} stopOpacity="0.28" />
              <stop offset="100%" stopColor={accentHex} stopOpacity="0" />
            </linearGradient>

            {/* Progress Arc Gradient */}
            <linearGradient id="progress-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={accentSoftHex} />
              <stop offset="100%" stopColor={isActivated ? '#6EE7B7' : '#7DD3FC'} />
            </linearGradient>

            {/* Inner Scanner Plate Radial */}
            <radialGradient id="scanner-plate-bg" cx="50%" cy="50%" r="50%">
              <stop
                offset="0%"
                stopColor={isActivated ? '#064E3B' : '#0C2342'}
                stopOpacity="0.45"
              />
              <stop offset="75%" stopColor="#071124" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#040814" stopOpacity="0.96" />
            </radialGradient>
          </defs>

          {/* Outer Calibrated Tick Ring */}
          <g className="animate-orbit-slow origin-[170px_170px]" opacity={isActivated ? 0.55 : 0.4}>
            <circle
              cx="170"
              cy="170"
              r="164"
              fill="none"
              stroke={accentHex}
              strokeWidth="1"
              strokeDasharray="2 10"
            />
          </g>

          {/* Counter-Rotating Precision Reticle */}
          <g
            className="animate-orbit-reverse origin-[170px_170px]"
            opacity={isScanning ? 0.8 : 0.32}
          >
            <circle
              cx="170"
              cy="170"
              r="140"
              fill="none"
              stroke={accentHex}
              strokeWidth="1"
              strokeDasharray="22 14 4 14"
            />
          </g>

          {/* Base Track Circle */}
          <circle
            cx="170"
            cy="170"
            r={RING_RADIUS}
            fill="url(#scanner-plate-bg)"
            stroke="rgba(148, 163, 184, 0.16)"
            strokeWidth="5"
          />

          {/* Progress Ring (0% - 100%) */}
          <circle
            cx="170"
            cy="170"
            r={RING_RADIUS}
            fill="none"
            stroke="url(#progress-ring-grad)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 170 170)"
            filter="url(#biometric-glow)"
            className="transition-[stroke] duration-300"
          />

          {/* Scanner Interior: Biometric Palm + Fingerprint + Laser */}
          <g clipPath="url(#scanner-inner-clip)">
            {/* Subtle Technical Grid Inside Lens */}
            <g opacity="0.14" stroke={accentHex} strokeWidth="0.6">
              <line x1="50" y1="170" x2="290" y2="170" />
              <line x1="170" y1="50" x2="170" y2="290" />
              <circle cx="170" cy="170" r="98" fill="none" />
              <circle cx="170" cy="170" r="64" fill="none" />
            </g>

            {/* Combined Palm & Fingerprint Graphic */}
            <g
              filter="url(#biometric-glow)"
              className={
                !isScanning && !isActivated ? 'animate-subtle-breath origin-[170px_170px]' : ''
              }
            >
              {/* Anatomical Palm & Five Fingers Outline */}
              <path
                d="M140 266
                   L138 232
                   C126 226 116 214 109 199
                   L92 164
                   C88 156 92 148 99 147
                   C106 146 112 151 116 159
                   L127 180
                   L125 110
                   C125 101 131 95 138 95
                   C145 95 150 101 150 110
                   L152 154
                   L157 88
                   C157 78 163 72 170 72
                   C177 72 183 78 183 88
                   L185 152
                   L192 98
                   C193 89 199 83 206 84
                   C213 85 218 92 217 101
                   L212 160
                   L224 122
                   C227 114 234 110 240 112
                   C246 114 249 122 246 130
                   L228 194
                   C223 213 212 227 202 234
                   L200 266"
                fill={isActivated ? 'rgba(16,185,129,0.12)' : 'rgba(56,189,248,0.08)'}
                stroke={accentHex}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-colors duration-300"
              />

              {/* Biometric Phalange Joint Markers & Palm Circuit Traces */}
              <g
                stroke={accentSoftHex}
                strokeWidth="1.2"
                strokeLinecap="round"
                fill="none"
                opacity={isScanning || isActivated ? 0.9 : 0.55}
              >
                {/* Finger biometric segments */}
                <path d="M132 125 H144" />
                <path d="M163 106 H177" />
                <path d="M163 130 H177" />
                <path d="M198 117 H211" />
                <path d="M229 142 L239 145" />
                <path d="M98 162 L107 158" />

                {/* Palm circuit nodes leading to fingerprint core */}
                <path d="M138 158 L146 168" />
                <path d="M170 150 L170 160" />
                <path d="M204 162 L195 170" />
                <path d="M148 238 L156 226" />
                <path d="M192 238 L184 226" />
                <circle cx="148" cy="240" r="2.2" fill={accentHex} />
                <circle cx="192" cy="240" r="2.2" fill={accentHex} />
              </g>

              {/* High-Detail Fingerprint Whorl Embedded in Palm Center */}
              <g
                transform="translate(170, 195)"
                stroke={isActivated ? '#6EE7B7' : '#7DD3FC'}
                strokeWidth="1.65"
                strokeLinecap="round"
                fill="none"
                opacity={isScanning || isActivated ? 0.98 : 0.78}
              >
                {/* Outer ridge */}
                <path d="M -24 -4 C -24 -22, 24 -22, 24 -4 C 24 14, 16 25, 4 27" />
                <path d="M -22 8 C -20 19, -11 26, -3 27" />
                {/* Ring 2 */}
                <path d="M -18 -5 C -18 -17, 18 -17, 18 -5 C 18 9, 12 19, 2 21" />
                <path d="M -17 6 C -15 15, -9 20, -4 21" />
                {/* Ring 3 */}
                <path d="M -12 -4 C -12 -12, 12 -12, 12 -4 C 12 6, 8 13, 1 15" />
                <path d="M -11 5 C -10 11, -6 14, -3 15" />
                {/* Ring 4 */}
                <path d="M -6 -3 C -6 -7, 6 -7, 6 -3 C 6 4, 3 8, 0 9" />
                {/* Core whorl */}
                <path d="M -1 -1 C -1 3, -3 6, -5 7" />
                <circle cx="0" cy="-2" r="1.3" fill={accentHex} stroke="none" />
              </g>
            </g>

            {/* Animated Laser Scanner Beam during active hold */}
            {isScanning && (
              <g className="animate-laser-sweep">
                <rect
                  x="30"
                  y="148"
                  width="280"
                  height="44"
                  fill="url(#laser-trail-grad)"
                />
                <rect
                  x="34"
                  y="168.5"
                  width="272"
                  height="3"
                  rx="1.5"
                  fill="url(#laser-beam-grad)"
                  filter="url(#biometric-glow)"
                />
              </g>
            )}
          </g>
        </svg>
      </button>

      {/* Percentage Readout & Status Guidance */}
      <div className="mt-6 flex flex-col items-center text-center min-h-[84px]">
        <div className="flex items-baseline gap-2">
          <span
            className={`font-mono text-3xl sm:text-4xl font-bold tabular-nums tracking-tight transition-colors duration-300 ${
              isActivated
                ? 'text-emerald-400'
                : isScanning
                ? 'text-sky-300'
                : 'text-slate-300'
            }`}
          >
            {Math.round(progress)}%
          </span>
        </div>

        <p
          role="status"
          aria-live="polite"
          className={`mt-2 text-sm sm:text-base font-medium transition-colors duration-300 max-w-md px-4 ${
            isActivated
              ? 'text-emerald-300 text-base sm:text-lg font-semibold'
              : isScanning
              ? 'text-sky-200'
              : hintMessage
              ? 'text-amber-300'
              : 'text-slate-300'
          }`}
        >
          {isActivated
            ? 'Aplikasi Sekolahku Resmi Diaktifkan!'
            : isScanning
            ? 'Memindai Biometrik... Tetap Tahan'
            : hintMessage || 'Sentuh & tahan pemindai selama 3 detik untuk meresmikan'}
        </p>
      </div>
    </div>
  );
};
