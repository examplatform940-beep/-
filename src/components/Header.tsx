import React from 'react';
import { Heart, Volume2, VolumeX, RotateCcw, Laugh, Sparkles } from 'lucide-react';

interface HeaderProps {
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  onResetChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  autoSpeak,
  onToggleAutoSpeak,
  onResetChat,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 sm:px-6 shadow-lg shadow-black/30">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Companion Avatar & Title */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 font-black text-xl">
              هـ
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>هەڤالێ هونەری</span>
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500 inline-block animate-pulse" />
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                بەهدینیێ ڕەسەن
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>ل ڤێرەمە برا • دەمژمێرێن درێژ بێ بێزاربوون دگەل تە مە</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Audio Auto-read toggle */}
          <button
            onClick={onToggleAutoSpeak}
            title={autoSpeak ? 'دەنگێ هەڤالی یێ ڤەکرییە' : 'دەنگێ هەڤالی یێ گرتییە'}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              autoSpeak
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{autoSpeak ? 'دەنگێ هەڤالی: ڤەکری' : 'دەنگێ هەڤالی: گرتی'}</span>
          </button>

          {/* Reset / Fresh talk */}
          <button
            onClick={onResetChat}
            title="دەستپێکرنا دانوستاندنەکا نوی"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
