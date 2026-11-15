export type ConnectionMode = 'iframe' | 'redirect';

export interface CeremonyConfig {
  schoolUrl: string;
  mode: ConnectionMode;
  redirectNewTab: boolean;
  subtitle: string;
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/<\/script/gi, '<\\/script');
}

export function generateSingleFileHtml(config: CeremonyConfig): string {
  const safeUrlJs = escapeJsString(config.schoolUrl);
  const safeSubtitleHtml = escapeHtmlAttr(config.subtitle);
  const safeModeJs = config.mode === 'redirect' ? 'redirect' : 'iframe';
  const safeNewTabJs = config.redirectNewTab ? 'true' : 'false';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Peresmian Digital Aplikasi Sekolahku</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@600;700&family=Outfit:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"><\/script>
  <style>
    :root {
      --bg: #040814;
      --surface: #0b1326;
      --border: rgba(148, 163, 184, 0.18);
      --text: #f1f5f9;
      --muted: #94a3b8;
      --accent: #38bdf8;
      --emerald: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--bg);
      color: var(--text);
      font-family: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
    }
    .stage {
      position: fixed;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background:
        radial-gradient(circle at 50% 45%, rgba(14, 165, 233, 0.12) 0%, transparent 58%),
        linear-gradient(180deg, #040814 0%, #070e20 100%);
      transition: opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.65s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 10;
    }
    .stage.hidden {
      opacity: 0;
      transform: scale(1.04);
      pointer-events: none;
    }
    .grid-bg {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(56, 189, 248, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(56, 189, 248, 0.04) 1px, transparent 1px);
      background-size: 48px 48px;
      mask-image: radial-gradient(circle at 50% 50%, black 20%, transparent 75%);
      pointer-events: none;
    }
    .settings-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 30;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: rgba(11, 19, 38, 0.72);
      color: var(--muted);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      backdrop-filter: blur(10px);
      transition: color 0.2s, border-color 0.2s, background 0.2s;
    }
    .settings-btn:hover { color: var(--text); border-color: rgba(56, 189, 248, 0.45); }
    @keyframes entranceHeader {
      from { opacity: 0; transform: translateY(-8px) scale(0.94); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes entranceScanner {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    .header {
      position: relative;
      text-align: center;
      margin-bottom: 24px;
      max-width: 720px;
      animation: entranceHeader 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .subtitle {
      font-size: 14px;
      color: var(--muted);
      margin-bottom: 10px;
      letter-spacing: 0.02em;
    }
    h1 {
      font-family: "Outfit", system-ui, sans-serif;
      font-size: clamp(1.75rem, 3.6vw, 3rem);
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.02em;
      color: #f8fafc;
      text-wrap: balance;
    }
    .scanner-wrap {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      user-select: none;
      -webkit-user-select: none;
      animation: entranceScanner 0.75s cubic-bezier(0.16, 1, 0.3, 1) 0.14s both;
    }
    @media (prefers-reduced-motion: reduce) {
      .header, .scanner-wrap { animation: none; }
    }
    .scanner-btn {
      position: relative;
      width: 320px;
      height: 320px;
      border-radius: 9999px;
      border: none;
      background: transparent;
      cursor: pointer;
      touch-action: none;
      user-select: none;
      -webkit-touch-callout: none;
      outline: none;
      transition: transform 0.2s ease;
    }
    .scanner-btn:active, .scanner-btn.scanning { transform: scale(0.985); }
    .scanner-btn.activated { cursor: default; transform: scale(1.03); }
    .scanner-svg { position: relative; z-index: 2; width: 100%; height: 100%; overflow: visible; }
    .freq-canvas {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 400px;
      height: 400px;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 1;
    }
    .laser-group { display: none; }
    .scanner-btn.scanning .laser-group {
      display: block;
      animation: laserSweep 1.35s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
    }
    @keyframes laserSweep {
      0% { transform: translateY(-108px); opacity: 0.25; }
      50% { transform: translateY(108px); opacity: 1; }
      100% { transform: translateY(-108px); opacity: 0.25; }
    }
    .readout {
      margin-top: 20px;
      text-align: center;
      min-height: 76px;
    }
    .percent {
      font-family: "JetBrains Mono", monospace;
      font-size: 2.25rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: #cbd5e1;
      transition: color 0.3s;
    }
    .percent.scanning { color: #7dd3fc; }
    .percent.activated { color: #34d399; }
    .status-text {
      margin-top: 8px;
      font-size: 15px;
      font-weight: 500;
      color: #cbd5e1;
      transition: color 0.3s;
    }
    .status-text.scanning { color: #bae6fd; }
    .status-text.activated { color: #6ee7b7; font-size: 17px; font-weight: 600; }
    .status-text.warning { color: #fcd34d; }

    /* Iframe Container */
    .app-frame-wrap {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.65s ease;
      z-index: 20;
      background: #ffffff;
    }
    .app-frame-wrap.visible {
      opacity: 1;
      pointer-events: auto;
    }
    .app-frame {
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
    }
    .frame-actions {
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 25;
      display: flex;
      gap: 8px;
      opacity: 0.35;
      transition: opacity 0.2s;
    }
    .frame-actions:hover { opacity: 1; }
    .frame-action-btn {
      padding: 8px 14px;
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.28);
      background: rgba(15, 23, 42, 0.85);
      color: #f8fafc;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      backdrop-filter: blur(8px);
      text-decoration: none;
    }

    /* Settings Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.78);
      backdrop-filter: blur(8px);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      z-index: 50;
    }
    .modal-backdrop.open { display: flex; }
    .modal {
      width: 100%;
      max-width: 460px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
    }
    .modal h2 {
      font-family: "Outfit", sans-serif;
      font-size: 20px;
      margin-bottom: 16px;
    }
    .field { margin-bottom: 16px; }
    .field label {
      display: block;
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 6px;
    }
    .field input, .field select {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: #060b18;
      color: var(--text);
      font-size: 14px;
      outline: none;
    }
    .field input:focus, .field select:focus { border-color: var(--accent); }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }
    .btn {
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
    }
    .btn-secondary {
      background: transparent;
      border-color: var(--border);
      color: var(--text);
    }
    .btn-primary {
      background: #0284c7;
      color: #ffffff;
    }
  </style>
</head>
<body>
  <button class="settings-btn" id="openSettingsBtn" aria-label="Pengaturan URL Aplikasi Sekolahku" title="Pengaturan Acara">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  </button>

  <main class="stage" id="ceremonyStage">
    <div class="grid-bg" aria-hidden="true"></div>
    <header class="header">
      <p class="subtitle" id="subtitleDisplay">${safeSubtitleHtml}</p>
      <h1>Peresmian Digital Aplikasi Sekolahku</h1>
    </header>

    <div class="scanner-wrap">
      <button class="scanner-btn" id="scannerBtn" aria-label="Sentuh dan tahan pemindai selama 3 detik">
        <canvas class="freq-canvas" id="freqCanvas" aria-hidden="true"></canvas>
        <svg class="scanner-svg" viewBox="0 0 340 340">
          <defs>
            <clipPath id="clipInner"><circle cx="170" cy="170" r="134" /></clipPath>
            <linearGradient id="laserGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#38BDF8" stop-opacity="0" />
              <stop offset="50%" stop-color="#FFFFFF" stop-opacity="1" />
              <stop offset="100%" stop-color="#38BDF8" stop-opacity="0" />
            </linearGradient>
          </defs>
          <circle cx="170" cy="170" r="150" fill="#071124" fill-opacity="0.85" stroke="rgba(148,163,184,0.16)" stroke-width="5" />
          <circle id="progressRing" cx="170" cy="170" r="150" fill="none" stroke="#38BDF8" stroke-width="6" stroke-linecap="round" transform="rotate(-90 170 170)" />
          <g clip-path="url(#clipInner)">
            <path id="palmPath"
              d="M140 266 L138 232 C126 226 116 214 109 199 L92 164 C88 156 92 148 99 147 C106 146 112 151 116 159 L127 180 L125 110 C125 101 131 95 138 95 C145 95 150 101 150 110 L152 154 L157 88 C157 78 163 72 170 72 C177 72 183 78 183 88 L185 152 L192 98 C193 89 199 83 206 84 C213 85 218 92 217 101 L212 160 L224 122 C227 114 234 110 240 112 C246 114 249 122 246 130 L228 194 C223 213 212 227 202 234 L200 266"
              fill="rgba(56,189,248,0.08)" stroke="#38BDF8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
            <g id="fingerprintGroup" transform="translate(170, 195)" stroke="#7DD3FC" stroke-width="1.65" stroke-linecap="round" fill="none">
              <path d="M -24 -4 C -24 -22, 24 -22, 24 -4 C 24 14, 16 25, 4 27" />
              <path d="M -22 8 C -20 19, -11 26, -3 27" />
              <path d="M -18 -5 C -18 -17, 18 -17, 18 -5 C 18 9, 12 19, 2 21" />
              <path d="M -17 6 C -15 15, -9 20, -4 21" />
              <path d="M -12 -4 C -12 -12, 12 -12, 12 -4 C 12 6, 8 13, 1 15" />
              <path d="M -11 5 C -10 11, -6 14, -3 15" />
              <path d="M -6 -3 C -6 -7, 6 -7, 6 -3 C 6 4, 3 8, 0 9" />
            </g>
            <g class="laser-group">
              <rect x="34" y="168.5" width="272" height="3" rx="1.5" fill="url(#laserGrad)" />
            </g>
          </g>
        </svg>
      </button>

      <div class="readout">
        <div class="percent" id="percentText">0%</div>
        <p class="status-text" id="statusText">Sentuh &amp; tahan pemindai selama 3 detik untuk meresmikan</p>
      </div>
    </div>
  </main>

  <section class="app-frame-wrap" id="appFrameWrap" aria-hidden="true">
    <iframe class="app-frame" id="schoolIframe" title="Aplikasi Sekolahku" allow="fullscreen"></iframe>
    <div class="frame-actions">
      <a class="frame-action-btn" id="openNewTabLink" href="#" target="_blank" rel="noopener noreferrer">Buka di Tab Baru</a>
      <button class="frame-action-btn" id="resetCeremonyBtn">Ulangi Seremoni</button>
    </div>
  </section>

  <div class="modal-backdrop" id="settingsModal">
    <div class="modal">
      <h2>Pengaturan Peresmian</h2>
      <div class="field">
        <label for="urlInput">URL Web Aplikasi Sekolahku</label>
        <input id="urlInput" type="url" placeholder="https://rbu21sekolah.netlify.app/" />
      </div>
      <div class="field">
        <label for="modeSelect">Mode Koneksi</label>
        <select id="modeSelect">
          <option value="iframe">Mode Iframe Fullscreen (100vw x 100vh)</option>
          <option value="redirect">Mode Redirect Otomatis</option>
        </select>
      </div>
      <div class="field">
        <label for="subtitleInput">Subjudul Acara</label>
        <input id="subtitleInput" type="text" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="closeModalBtn">Batal</button>
        <button class="btn btn-primary" id="saveSettingsBtn">Simpan</button>
      </div>
    </div>
  </div>

  <script>
    // =========================================================================
    // KONFIGURASI UTAMA SEREMONI PERESMIAN
    // =========================================================================
    const URL_WEB_SEKOLAH = "${safeUrlJs}";
    const MODE_KONEKSI = "${safeModeJs}"; // Pilihan: "iframe" | "redirect"
    const REDIRECT_TAB_BARU = ${safeNewTabJs};
    const DURASI_TAHAN_MS = 3000;
    const JEDA_TRANSISI_MS = 2000;

    let activeUrl = localStorage.getItem("sekolahku_url") || URL_WEB_SEKOLAH;
    let activeMode = localStorage.getItem("sekolahku_mode") || MODE_KONEKSI;

    const stage = document.getElementById("ceremonyStage");
    const scannerBtn = document.getElementById("scannerBtn");
    const progressRing = document.getElementById("progressRing");
    const palmPath = document.getElementById("palmPath");
    const fingerprintGroup = document.getElementById("fingerprintGroup");
    const percentText = document.getElementById("percentText");
    const statusText = document.getElementById("statusText");
    const appFrameWrap = document.getElementById("appFrameWrap");
    const schoolIframe = document.getElementById("schoolIframe");
    const openNewTabLink = document.getElementById("openNewTabLink");
    const resetCeremonyBtn = document.getElementById("resetCeremonyBtn");
    const subtitleDisplay = document.getElementById("subtitleDisplay");

    const openSettingsBtn = document.getElementById("openSettingsBtn");
    const settingsModal = document.getElementById("settingsModal");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const saveSettingsBtn = document.getElementById("saveSettingsBtn");
    const urlInput = document.getElementById("urlInput");
    const modeSelect = document.getElementById("modeSelect");
    const subtitleInput = document.getElementById("subtitleInput");

    const CIRCUMFERENCE = 2 * Math.PI * 150;
    progressRing.style.strokeDasharray = CIRCUMFERENCE;
    progressRing.style.strokeDashoffset = CIRCUMFERENCE;

    const freqCanvas = document.getElementById("freqCanvas");
    const freqCtx = freqCanvas.getContext("2d");

    let audioCtx = null;
    let analyserNode = null;
    let freqData = null;
    let scanNodes = null;
    let tickTimer = null;
    let animFrame = null;
    let vizFrame = null;
    let holdStart = 0;
    let isActivated = false;
    let isHolding = false;

    const VIZ_BARS = 64;
    const smoothedBars = new Float32Array(VIZ_BARS);

    function getAudioCtx() {
      if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) audioCtx = new Ctx();
      }
      if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
      if (audioCtx && !analyserNode) {
        analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 128;
        analyserNode.smoothingTimeConstant = 0.72;
        analyserNode.minDecibels = -85;
        analyserNode.maxDecibels = -18;
        analyserNode.connect(audioCtx.destination);
        freqData = new Uint8Array(analyserNode.frequencyBinCount);
      }
      return audioCtx;
    }

    function renderVisualizer() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = 400;
      const h = 400;
      if (freqCanvas.width !== w * dpr || freqCanvas.height !== h * dpr) {
        freqCanvas.width = w * dpr;
        freqCanvas.height = h * dpr;
      }
      freqCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      freqCtx.clearRect(0, 0, w, h);

      if (analyserNode && freqData && (isHolding || isActivated)) {
        analyserNode.getByteFrequencyData(freqData);
      }

      const half = VIZ_BARS / 2;
      const usable = freqData ? Math.min(36, freqData.length) : 32;
      let total = 0;

      for (let i = 0; i < VIZ_BARS; i++) {
        const mirror = i < half ? i : VIZ_BARS - 1 - i;
        const bin = Math.min(usable - 1, Math.floor((mirror / half) * usable));
        let target = 0;
        if ((isHolding || isActivated) && freqData) {
          target = Math.min(1, (freqData[bin] / 255) * (0.85 + (mirror / half) * 0.45));
        }
        const rate = target > smoothedBars[i] ? 0.42 : 0.16;
        smoothedBars[i] += (target - smoothedBars[i]) * rate;
        total += smoothedBars[i];
      }

      const avg = total / VIZ_BARS;
      if (avg > 0.004 || isHolding) {
        const cx = w / 2;
        const cy = h / 2;
        const baseR = 152;
        const maxLen = 42;
        const rgb = isActivated ? "16, 185, 129" : "56, 189, 248";
        const tipRgb = isActivated ? "110, 231, 183" : "186, 230, 253";

        freqCtx.lineCap = "round";
        freqCtx.lineWidth = 3;
        for (let i = 0; i < VIZ_BARS; i++) {
          const angle = (i / VIZ_BARS) * Math.PI * 2 - Math.PI / 2;
          const amp = smoothedBars[i];
          const len = Math.max(isHolding ? 3 : 0, amp * maxLen);
          if (len <= 0.5) continue;
          const x1 = cx + Math.cos(angle) * baseR;
          const y1 = cy + Math.sin(angle) * baseR;
          const x2 = cx + Math.cos(angle) * (baseR + len);
          const y2 = cy + Math.sin(angle) * (baseR + len);
          const grad = freqCtx.createLinearGradient(x1, y1, x2, y2);
          grad.addColorStop(0, "rgba(" + rgb + "," + (0.35 + amp * 0.55) + ")");
          grad.addColorStop(1, "rgba(" + tipRgb + "," + (0.55 + amp * 0.45) + ")");
          freqCtx.beginPath();
          freqCtx.moveTo(x1, y1);
          freqCtx.lineTo(x2, y2);
          freqCtx.strokeStyle = grad;
          freqCtx.stroke();
        }
      }

      if (isHolding || isActivated || avg > 0.004) {
        vizFrame = requestAnimationFrame(renderVisualizer);
      } else {
        vizFrame = null;
      }
    }

    function ensureVisualizerLoop() {
      if (!vizFrame) vizFrame = requestAnimationFrame(renderVisualizer);
    }

    function startScanSound() {
      const ctx = getAudioCtx();
      if (!ctx) return;
      stopScanSound();
      const output = analyserNode || ctx.destination;
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.12);
      gain.connect(output);

      const osc1 = ctx.createOscillator();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(140, now);
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(340, now);
      osc1.connect(filter);
      filter.connect(gain);

      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(420, now);
      osc2.connect(gain);

      osc1.start(now);
      osc2.start(now);
      scanNodes = { osc1, osc2, filter, gain };

      tickTimer = setInterval(() => {
        const t = ctx.currentTime;
        const tick = ctx.createOscillator();
        const tg = ctx.createGain();
        tick.type = "sine";
        tick.frequency.setValueAtTime(880, t);
        tg.gain.setValueAtTime(0.06, t);
        tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        tick.connect(tg);
        tg.connect(output);
        tick.start(t);
        tick.stop(t + 0.07);
      }, 170);
      ensureVisualizerLoop();
    }

    function updateScanSound(p) {
      if (!audioCtx || !scanNodes) return;
      const now = audioCtx.currentTime;
      scanNodes.osc1.frequency.setTargetAtTime(140 + p * 220, now, 0.04);
      scanNodes.osc2.frequency.setTargetAtTime(420 + p * 520, now, 0.04);
      scanNodes.filter.frequency.setTargetAtTime(340 + p * 1500, now, 0.05);
    }

    function stopScanSound() {
      if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
      if (scanNodes && audioCtx) {
        const { osc1, osc2, gain } = scanNodes;
        scanNodes = null;
        try {
          gain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.03);
          setTimeout(() => { osc1.stop(); osc2.stop(); }, 100);
        } catch (e) {}
      }
    }

    function playSuccessSound() {
      stopScanSound();
      const ctx = getAudioCtx();
      if (!ctx) return;
      const output = analyserNode || ctx.destination;
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 987.77, 1046.5].forEach((freq, i) => {
        const start = now + i * 0.065;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(0.001, start);
        g.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 1.1);
        osc.connect(g);
        g.connect(output);
        osc.start(start);
        osc.stop(start + 1.15);
      });
    }

    function setProgressUI(pct) {
      const clamped = Math.max(0, Math.min(100, pct));
      progressRing.style.strokeDashoffset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;
      percentText.textContent = Math.round(clamped) + "%";
    }

    function completeActivation() {
      isActivated = true;
      isHolding = false;
      setProgressUI(100);
      scannerBtn.classList.remove("scanning");
      scannerBtn.classList.add("activated");
      progressRing.setAttribute("stroke", "#10B981");
      palmPath.setAttribute("stroke", "#10B981");
      palmPath.setAttribute("fill", "rgba(16,185,129,0.14)");
      fingerprintGroup.setAttribute("stroke", "#6EE7B7");
      percentText.className = "percent activated";
      statusText.className = "status-text activated";
      statusText.textContent = "Aplikasi Sekolahku Resmi Diaktifkan!";

      playSuccessSound();

      if (typeof confetti === "function") {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.58 } });
        setTimeout(() => {
          confetti({ particleCount: 55, angle: 60, spread: 55, origin: { x: 0.1, y: 0.65 } });
          confetti({ particleCount: 55, angle: 120, spread: 55, origin: { x: 0.9, y: 0.65 } });
        }, 250);
      }

      setTimeout(() => {
        if (activeMode === "redirect") {
          if (REDIRECT_TAB_BARU) {
            window.open(activeUrl, "_blank", "noopener,noreferrer");
          } else {
            window.location.href = activeUrl;
          }
        } else {
          schoolIframe.src = activeUrl;
          openNewTabLink.href = activeUrl;
          stage.classList.add("hidden");
          appFrameWrap.classList.add("visible");
          appFrameWrap.setAttribute("aria-hidden", "false");
        }
      }, JEDA_TRANSISI_MS);
    }

    function startHold(e) {
      if (isActivated || isHolding) return;
      if (e) e.preventDefault();
      isHolding = true;
      holdStart = performance.now();
      scannerBtn.classList.add("scanning");
      percentText.className = "percent scanning";
      statusText.className = "status-text scanning";
      statusText.textContent = "Memindai Biometrik... Tetap Tahan";
      startScanSound();

      function tick(now) {
        if (!isHolding || isActivated) return;
        const elapsed = now - holdStart;
        const ratio = Math.min(1, elapsed / DURASI_TAHAN_MS);
        setProgressUI(ratio * 100);
        updateScanSound(ratio);
        if (ratio >= 1) {
          completeActivation();
        } else {
          animFrame = requestAnimationFrame(tick);
        }
      }
      animFrame = requestAnimationFrame(tick);
    }

    function endHold() {
      if (!isHolding || isActivated) return;
      isHolding = false;
      if (animFrame) cancelAnimationFrame(animFrame);
      stopScanSound();
      scannerBtn.classList.remove("scanning");
      setProgressUI(0);
      percentText.className = "percent";
      statusText.className = "status-text warning";
      statusText.textContent = "Tahan selama 3 detik penuh hingga mencapai 100%";
    }

    scannerBtn.addEventListener("pointerdown", startHold);
    scannerBtn.addEventListener("pointerup", endHold);
    scannerBtn.addEventListener("pointercancel", endHold);
    scannerBtn.addEventListener("contextmenu", (e) => e.preventDefault());

    resetCeremonyBtn.addEventListener("click", () => {
      isActivated = false;
      appFrameWrap.classList.remove("visible");
      appFrameWrap.setAttribute("aria-hidden", "true");
      schoolIframe.src = "about:blank";
      stage.classList.remove("hidden");
      scannerBtn.classList.remove("activated");
      progressRing.setAttribute("stroke", "#38BDF8");
      palmPath.setAttribute("stroke", "#38BDF8");
      palmPath.setAttribute("fill", "rgba(56,189,248,0.08)");
      fingerprintGroup.setAttribute("stroke", "#7DD3FC");
      setProgressUI(0);
      percentText.className = "percent";
      statusText.className = "status-text";
      statusText.textContent = "Sentuh & tahan pemindai selama 3 detik untuk meresmikan";
    });

    openSettingsBtn.addEventListener("click", () => {
      urlInput.value = activeUrl;
      modeSelect.value = activeMode;
      subtitleInput.value = subtitleDisplay.textContent;
      settingsModal.classList.add("open");
    });
    closeModalBtn.addEventListener("click", () => settingsModal.classList.remove("open"));
    saveSettingsBtn.addEventListener("click", () => {
      const val = urlInput.value.trim();
      if (val) {
        activeUrl = val;
        localStorage.setItem("sekolahku_url", activeUrl);
      }
      activeMode = modeSelect.value;
      localStorage.setItem("sekolahku_mode", activeMode);
      subtitleDisplay.textContent = subtitleInput.value.trim() || "Transformasi Ekosistem Pendidikan Digital";
      settingsModal.classList.remove("open");
    });
  <\/script>
</body>
</html>`;
}
