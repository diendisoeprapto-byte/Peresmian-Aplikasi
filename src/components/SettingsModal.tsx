import React, { useState, useEffect } from 'react';
import { X, Download, RotateCcw, Volume2, Globe, Monitor, ExternalLink } from 'lucide-react';
import { CeremonyConfig, ConnectionMode, generateSingleFileHtml } from '../utils/singleFileGenerator';
import { biometricAudio } from '../utils/biometricAudio';

interface SettingsModalProps {
  isOpen: boolean;
  config: CeremonyConfig;
  defaultUrl: string;
  onClose: () => void;
  onSave: (nextConfig: CeremonyConfig) => void;
  onResetCeremony: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  config,
  defaultUrl,
  onClose,
  onSave,
  onResetCeremony,
}) => {
  const [schoolUrl, setSchoolUrl] = useState(config.schoolUrl);
  const [mode, setMode] = useState<ConnectionMode>(config.mode);
  const [redirectNewTab, setRedirectNewTab] = useState(config.redirectNewTab);
  const [subtitle, setSubtitle] = useState(config.subtitle);
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSchoolUrl(config.schoolUrl);
      setMode(config.mode);
      setRedirectNewTab(config.redirectNewTab);
      setSubtitle(config.subtitle);
      setUrlError(null);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const validateAndNormalizeUrl = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(withProtocol);
      return parsed.toString();
    } catch {
      return null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = validateAndNormalizeUrl(schoolUrl);
    if (!normalized) {
      setUrlError('Masukkan URL web yang valid (contoh: https://rbu21sekolah.netlify.app/)');
      return;
    }

    onSave({
      schoolUrl: normalized,
      mode,
      redirectNewTab,
      subtitle: subtitle.trim() || 'Transformasi Ekosistem Pendidikan Digital',
    });
    onClose();
  };

  const handleDownloadSingleHtml = () => {
    const normalized = validateAndNormalizeUrl(schoolUrl) || config.schoolUrl;
    const htmlContent = generateSingleFileHtml({
      schoolUrl: normalized,
      mode,
      redirectNewTab,
      subtitle: subtitle.trim() || 'Transformasi Ekosistem Pendidikan Digital',
    });
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'peresmian-aplikasi-sekolahku.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTestAudio = () => {
    biometricAudio.unlock();
    biometricAudio.playSuccess();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0B1224] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div>
            <h2
              id="settings-modal-title"
              className="font-display text-lg font-semibold text-slate-100"
            >
              Pengaturan Seremoni Peresmian
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Sesuaikan tautan tujuan dan mode transisi saat acara berlangsung
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800/70 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* School Web URL */}
          <div>
            <label
              htmlFor="school-url-input"
              className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-200"
            >
              <Globe className="h-4 w-4 text-sky-400" />
              URL Web Aplikasi Sekolahku
            </label>
            <input
              id="school-url-input"
              type="text"
              value={schoolUrl}
              onChange={(e) => {
                setSchoolUrl(e.target.value);
                setUrlError(null);
              }}
              placeholder={defaultUrl}
              className="w-full rounded-xl border border-slate-700/80 bg-[#060B18] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
            {urlError ? (
              <p className="mt-1.5 text-xs text-amber-400">{urlError}</p>
            ) : (
              <p className="mt-1.5 text-xs text-slate-400">
                Bawaan: <span className="font-mono text-slate-300">{defaultUrl}</span>
              </p>
            )}
          </div>

          {/* Connection Mode */}
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-200">
              Mode Koneksi Setelah Aktivasi
            </span>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode('iframe')}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                  mode === 'iframe'
                    ? 'border-sky-400/80 bg-sky-500/10 text-slate-100'
                    : 'border-slate-800 bg-[#060B18]/70 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                <div>
                  <div className="text-sm font-semibold">Iframe Fullscreen</div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    Tampil layar penuh di halaman yang sama
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('redirect')}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                  mode === 'redirect'
                    ? 'border-sky-400/80 bg-sky-500/10 text-slate-100'
                    : 'border-slate-800 bg-[#060B18]/70 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                <div>
                  <div className="text-sm font-semibold">Redirect Otomatis</div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    Arahkan browser langsung jika iframe diblokir
                  </div>
                </div>
              </button>
            </div>

            {mode === 'redirect' && (
              <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={redirectNewTab}
                  onChange={(e) => setRedirectNewTab(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-400"
                />
                Buka di tab baru saat pengalihan (berguna jika tombol kembali diperlukan)
              </label>
            )}
          </div>

          {/* Subtitle */}
          <div>
            <label
              htmlFor="ceremony-subtitle-input"
              className="mb-1.5 block text-sm font-medium text-slate-200"
            >
              Subjudul Acara
            </label>
            <input
              id="ceremony-subtitle-input"
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Transformasi Ekosistem Pendidikan Digital"
              className="w-full rounded-xl border border-slate-700/80 bg-[#060B18] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
          </div>

          {/* Utility Row: Test Sound, Reset, Single-File HTML Export */}
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-4">
            <button
              type="button"
              onClick={handleTestAudio}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-sky-500/50 hover:text-white whitespace-nowrap"
            >
              <Volume2 className="h-3.5 w-3.5 text-sky-400" />
              Uji Audio
            </button>

            <button
              type="button"
              onClick={() => {
                onResetCeremony();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-sky-500/50 hover:text-white whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5 text-sky-400" />
              Reset Layar
            </button>

            <button
              type="button"
              onClick={handleDownloadSingleHtml}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-emerald-500/50 hover:text-white whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              Unduh Single-File HTML
            </button>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white whitespace-nowrap"
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-xl bg-sky-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-500 whitespace-nowrap"
            >
              Simpan Pengaturan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
