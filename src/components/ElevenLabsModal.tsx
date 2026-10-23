import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Volume2,
  Trash2,
  X,
  Sparkles,
  ExternalLink,
  Loader2,
  Play,
  ShieldCheck,
} from 'lucide-react';

interface ElevenLabsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved: (key: string, voiceId: string, modelId: string) => void;
  onTestVoice: (key: string, voiceId: string, modelId: string) => Promise<void>;
  currentKey: string;
  currentVoiceId: string;
  currentModelId: string;
  isTestingAudio: boolean;
}

const PRESET_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', desc: 'ئارام، زەلال و پێگەهشتی' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', desc: 'گەرم، هەڤالانە و دەنگێ کورەکی' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', desc: 'چەلەنگ، گەنج و دلسۆز' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', desc: 'پڕ متمانە و قورس' },
];

export default function ElevenLabsModal({
  isOpen,
  onClose,
  onKeySaved,
  onTestVoice,
  currentKey,
  currentVoiceId,
  currentModelId,
  isTestingAudio,
}: ElevenLabsModalProps) {
  const [apiKey, setApiKey] = useState(currentKey);
  const [showKey, setShowKey] = useState(false);
  const [voiceId, setVoiceId] = useState(currentVoiceId || '21m00Tcm4TlvDq8ikWAM');
  const [customVoiceId, setCustomVoiceId] = useState('');
  const [modelId, setModelId] = useState(currentModelId || 'eleven_multilingual_v2');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{
    success: boolean;
    message: string;
    tier?: string;
    remaining?: number;
  } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setApiKey(currentKey);
    setVoiceId(currentVoiceId || '21m00Tcm4TlvDq8ikWAM');
    setModelId(currentModelId || 'eleven_multilingual_v2');
  }, [currentKey, currentVoiceId, currentModelId]);

  if (!isOpen) return null;

  const handleSave = () => {
    const finalVoice = voiceId === 'custom' ? customVoiceId.trim() : voiceId;
    localStorage.setItem('elevenlabs_api_key', apiKey.trim());
    localStorage.setItem('elevenlabs_voice_id', finalVoice || '21m00Tcm4TlvDq8ikWAM');
    localStorage.setItem('elevenlabs_model_id', modelId);
    onKeySaved(apiKey.trim(), finalVoice || '21m00Tcm4TlvDq8ikWAM', modelId);

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleClear = () => {
    setApiKey('');
    setCustomVoiceId('');
    localStorage.removeItem('elevenlabs_api_key');
    localStorage.removeItem('elevenlabs_voice_id');
    localStorage.removeItem('elevenlabs_model_id');
    onKeySaved('', '21m00Tcm4TlvDq8ikWAM', 'eleven_multilingual_v2');
    setVerifyStatus(null);
  };

  const handleVerify = async () => {
    if (!apiKey.trim()) {
      setVerifyStatus({ success: false, message: 'تکایە پێشتر کلیلا خۆ بنڤیسە' });
      return;
    }
    setIsVerifying(true);
    setVerifyStatus(null);
    try {
      const res = await fetch('/api/elevenlabs/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setVerifyStatus({
          success: true,
          message: 'کلیلا تە یا ڕاستە و سەرکەفتیانە گرێدا!',
          tier: data.tier,
          remaining: (data.characterLimit || 0) - (data.characterCount || 0),
        });
        handleSave();
      } else {
        setVerifyStatus({
          success: false,
          message: data.error || 'کلیلا تە یا نادروستە، تکایە دڵنیاببە',
        });
      }
    } catch {
      setVerifyStatus({
        success: false,
        message: 'کێشەیەک د گرێدانێ دا چێبوو، ئینتەرنێتا خۆ بپشکنە',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTest = () => {
    const finalVoice = voiceId === 'custom' ? customVoiceId.trim() : voiceId;
    onTestVoice(apiKey.trim(), finalVoice || '21m00Tcm4TlvDq8ikWAM', modelId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>بوکسێ کلیلا ElevenLabs</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                  دەنگێ زیرەک
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                کلیلا خۆ یا ئەلیڤێن لاب دانە دا هەڤالێ تە ب دەنگەکێ گەلەک سروشتی باخڤیت
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm" dir="rtl">
          {/* API Key Input Box */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                <span>کلیلا ElevenLabs (API Key):</span>
              </span>
              <a
                href="https://elevenlabs.io"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
              >
                <span>وەرگرتنا کلیلێ ب بەلاش</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="xi-api-key یان کلیلا خۆ ل ڤێرە دانە..."
                className="w-full px-3.5 py-3 pr-10 rounded-2xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors font-mono"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                title={showKey ? 'ڤەشارتن' : 'نیشاندان'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              ئەڤ کلیلە ب شێوەیەکێ پاراستی ل سەر براوسەرێ تە دهێتە هەلگرتن و بتنێ بۆ دروستکرنا دەنگێ بەهدینی یێ سروشتی دهێتە بکارئینان.
            </p>
          </div>

          {/* Verification Status */}
          {verifyStatus && (
            <div
              className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                verifyStatus.success
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
              }`}
            >
              {verifyStatus.success ? (
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-semibold">{verifyStatus.message}</div>
                {verifyStatus.tier && (
                  <div className="text-[11px] opacity-80 mt-1">
                    جۆرێ بەشداریێ: {verifyStatus.tier} • پیتیێن ماین: {verifyStatus.remaining?.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Voice Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-purple-400" />
              <span>هەڵبژارتنا دەنگی (Voice):</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_VOICES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVoiceId(v.id)}
                  className={`p-2.5 rounded-2xl border text-right transition-all flex flex-col gap-0.5 ${
                    voiceId === v.id
                      ? 'bg-purple-950/60 border-purple-500 text-white shadow-lg shadow-purple-500/10'
                      : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs">{v.name}</span>
                    {voiceId === v.id && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <span className="text-[11px] text-slate-400">{v.desc}</span>
                </button>
              ))}
            </div>

            {/* Custom Voice ID option */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setVoiceId('custom')}
                className={`w-full p-2.5 rounded-2xl border text-right text-xs transition-all flex items-center justify-between ${
                  voiceId === 'custom'
                    ? 'bg-purple-950/60 border-purple-500 text-white'
                    : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span>دەنگێ تایبەت (Custom Cloned Voice ID)</span>
                {voiceId === 'custom' && <Check className="w-3.5 h-3.5 text-purple-400" />}
              </button>

              {voiceId === 'custom' && (
                <input
                  type="text"
                  value={customVoiceId}
                  onChange={(e) => setCustomVoiceId(e.target.value)}
                  placeholder="Voice ID یێ دەنگێ خۆ بنڤیسە..."
                  className="mt-2 w-full px-3 py-2 rounded-xl bg-slate-950 border border-purple-500/60 text-white text-xs font-mono"
                  dir="ltr"
                />
              )}
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>مۆدێلا زمان (AI Model):</span>
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setModelId('eleven_multilingual_v2')}
                className={`p-2 rounded-xl border text-center transition-all ${
                  modelId === 'eleven_multilingual_v2'
                    ? 'bg-purple-950/60 border-purple-500 text-white font-bold'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div>Multilingual v2</div>
                <div className="text-[10px] text-emerald-400 font-normal mt-0.5">پێشنیارکری بۆ کوردی</div>
              </button>
              <button
                type="button"
                onClick={() => setModelId('eleven_turbo_v2_5')}
                className={`p-2 rounded-xl border text-center transition-all ${
                  modelId === 'eleven_turbo_v2_5'
                    ? 'bg-purple-950/60 border-purple-500 text-white font-bold'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div>Turbo v2.5</div>
                <div className="text-[10px] text-slate-400 font-normal mt-0.5">لەزگین ترین</div>
              </button>
            </div>
          </div>

          {/* Action Buttons: Test Voice & Save */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTestingAudio || isVerifying || !apiKey.trim()}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 active:scale-95 transition-all"
            >
              {isTestingAudio ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>یێ دەنگی دروست دکەت...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>تاقیکرنا دەنگێ ElevenLabs</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying || !apiKey.trim()}
              className="w-full sm:w-auto py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>پشکنینا کلیلێ</span>
            </button>

            {apiKey.trim() && (
              <button
                type="button"
                onClick={handleClear}
                className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-rose-950/60 hover:border-rose-700/50 text-slate-400 hover:text-rose-300 transition-colors"
                title="ژێبرنا کلیلێ"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {savedSuccess && (
            <div className="text-center text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1 animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>کلیل و ڕێکخستن ب سەرکەفتی هاتنە پاشکەوتکرن!</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-400 flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${apiKey.trim() ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}
            />
            <span>{apiKey.trim() ? 'ElevenLabs چالاکە' : 'دەنگێ خودکار یێ ئاسایی کار دکەت'}</span>
          </div>

          <button
            onClick={() => {
              handleSave();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors"
          >
            تەواو
          </button>
        </div>
      </div>
    </div>
  );
}
