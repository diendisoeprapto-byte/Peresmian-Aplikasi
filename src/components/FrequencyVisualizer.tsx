import React, { useEffect, useRef } from 'react';
import { biometricAudio } from '../utils/biometricAudio';
import type { ScanStatus } from './BiometricScanner';

interface FrequencyVisualizerProps {
  status: ScanStatus;
  progress: number;
}

const BAR_COUNT = 64;

export const FrequencyVisualizer: React.FC<FrequencyVisualizerProps> = ({ status, progress }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const statusRef = useRef<ScanStatus>(status);
  const progressRef = useRef<number>(progress);
  const smoothedBarsRef = useRef<Float32Array>(new Float32Array(BAR_COUNT));

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const binCount = biometricAudio.getFrequencyBinCount();
    const freqData = new Uint8Array(new ArrayBuffer(binCount));
    let rafId: number | null = null;

    const syncCanvasDimensions = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;

      const targetW = Math.round(width * dpr);
      const targetH = Math.round(height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncCanvasDimensions();
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncCanvasDimensions) : null;
    resizeObserver?.observe(canvas);

    const draw = () => {
      syncCanvasDimensions();
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) {
        rafId = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      const currentStatus = statusRef.current;
      const isScanning = currentStatus === 'scanning';
      const isActivated = currentStatus === 'activated';

      const hasAudioData =
        (isScanning || isActivated) && biometricAudio.getFrequencyData(freqData);

      const smoothed = smoothedBarsRef.current;
      let totalEnergy = 0;

      // Map 32 useful lower-to-mid FFT bins symmetrically around the 64 radial bars
      const halfBars = BAR_COUNT / 2;
      const usableBins = Math.min(36, freqData.length);

      for (let i = 0; i < BAR_COUNT; i++) {
        const mirrorIdx = i < halfBars ? i : BAR_COUNT - 1 - i;
        const binIdx = Math.min(
          usableBins - 1,
          Math.floor((mirrorIdx / halfBars) * usableBins)
        );

        let targetAmp = 0;
        if (isScanning || isActivated) {
          if (hasAudioData) {
            const raw = freqData[binIdx] / 255;
            // Subtle high-frequency boost so harmonic sweeps stay crisp around the ring
            const tilt = 0.85 + (mirrorIdx / halfBars) * 0.45;
            targetAmp = Math.min(1, raw * tilt);
          } else if (isScanning) {
            // Minimal fallback wave if Web Audio is blocked by browser autoplay policy
            const p = progressRef.current / 100;
            targetAmp = 0.15 + p * 0.3;
          }
        }

        if (prefersReducedMotion) {
          smoothed[i] = isScanning ? 0.35 : isActivated ? 0.5 : 0;
        } else {
          const attack = targetAmp > smoothed[i] ? 0.42 : 0.16;
          smoothed[i] += (targetAmp - smoothed[i]) * attack;
        }

        totalEnergy += smoothed[i];
      }

      const avgEnergy = totalEnergy / BAR_COUNT;

      // Only render active bars when there is meaningful signal or active scan
      if (avgEnergy > 0.004 || isScanning) {
        const cx = width / 2;
        const cy = height / 2;
        // Align just outside the r=150 progress ring (SVG is ~81% of this canvas)
        const baseRadius = width * 0.378;
        const maxBarLength = width * 0.105;

        const strokeRgb = isActivated ? '16, 185, 129' : '56, 189, 248';
        const tipRgb = isActivated ? '110, 231, 183' : '186, 230, 253';

        // Subtle outer harmonic envelope polygon
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i <= BAR_COUNT; i++) {
          const idx = i % BAR_COUNT;
          const angle = (idx / BAR_COUNT) * Math.PI * 2 - Math.PI / 2;
          const amp = smoothed[idx];
          const r = baseRadius + 4 + amp * maxBarLength;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(${strokeRgb}, ${0.14 + avgEnergy * 0.35})`;
        ctx.lineWidth = 1.25;
        ctx.fillStyle = `rgba(${strokeRgb}, ${0.03 + avgEnergy * 0.09})`;
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Radial FFT spectrum bars
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = width >= 400 ? 3 : 2.4;

        for (let i = 0; i < BAR_COUNT; i++) {
          const angle = (i / BAR_COUNT) * Math.PI * 2 - Math.PI / 2;
          const amp = smoothed[i];
          const barLen = Math.max(isScanning ? 3 : 0, amp * maxBarLength);
          if (barLen <= 0.5) continue;

          const rStart = baseRadius;
          const rEnd = baseRadius + barLen;

          const x1 = cx + Math.cos(angle) * rStart;
          const y1 = cy + Math.sin(angle) * rStart;
          const x2 = cx + Math.cos(angle) * rEnd;
          const y2 = cy + Math.sin(angle) * rEnd;

          const grad = ctx.createLinearGradient(x1, y1, x2, y2);
          grad.addColorStop(0, `rgba(${strokeRgb}, ${0.35 + amp * 0.55})`);
          grad.addColorStop(1, `rgba(${tipRgb}, ${0.55 + amp * 0.45})`);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = grad;
          ctx.stroke();
        }
        ctx.restore();
      }

      if (isScanning || isActivated || avgEnergy > 0.004) {
        rafId = requestAnimationFrame(draw);
      } else {
        rafId = null;
      }
    };

    // Start loop whenever status transitions to scanning/activated or while decaying
    rafId = requestAnimationFrame(draw);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
    };
  }, [status]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 sm:h-[420px] sm:w-[420px]"
    />
  );
};
