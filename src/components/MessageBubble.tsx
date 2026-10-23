import React, { useState } from 'react';
import { Volume2, VolumeX, Copy, Check, Heart, Smile } from 'lucide-react';
import { ChatMessage } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
  onPlayAudio: (messageId: string, text: string) => void;
  isPlayingAudio: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onPlayAudio,
  isPlayingAudio,
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 mb-5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className="shrink-0 mt-1">
        {isUser ? (
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-500/20">
            هونەر
          </div>
        ) : (
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-md shadow-amber-500/20">
            هـ
          </div>
        )}
      </div>

      {/* Content wrapper */}
      <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Author & Time */}
        <div className="flex items-center gap-2 mb-1.5 text-[11px] text-slate-400 font-medium px-1">
          <span>{isUser ? 'هونەر (Honar)' : 'هەڤالێ تە یێ بەهدینی'}</span>
          <span>•</span>
          <span dir="ltr">{message.timestamp}</span>
        </div>

        {/* Bubble */}
        <div
          className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-md transition-all relative ${
            isUser
              ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-tr-sm border border-emerald-500/30 shadow-emerald-950/40'
              : 'bg-slate-900/95 text-slate-100 rounded-tl-sm border border-slate-800/90 shadow-black/50'
          }`}
        >
          {message.text}

          {/* Reaction display if reacted */}
          {reaction && (
            <span className="absolute -bottom-2 -left-2 bg-slate-800 border border-slate-700 rounded-full px-1.5 py-0.5 text-xs shadow-md">
              {reaction}
            </span>
          )}
        </div>

        {/* Message Utilities for Companion (Voice, Reaction, Copy) */}
        {!isUser && (
          <div className="flex items-center gap-1.5 mt-2 px-1">
            {/* Audio Voice Player Button */}
            <button
              onClick={() => onPlayAudio(message.id, message.text)}
              disabled={message.isLoadingAudio}
              className={`px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                isPlayingAudio
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 border border-slate-800 text-amber-300 hover:border-amber-500/40 hover:bg-slate-800'
              }`}
              title="گوهداریکرن ب دەنگێ گەرم یێ هەڤالی"
            >
              {message.isLoadingAudio ? (
                <span className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              ) : isPlayingAudio ? (
                <div className="flex items-end gap-0.5 h-3.5 px-0.5">
                  <span className="w-1 bg-slate-950 rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ height: '60%' }} />
                  <span className="w-1 bg-slate-950 rounded-full animate-[bounce_0.8s_ease-in-out_infinite]" style={{ height: '100%' }} />
                  <span className="w-1 bg-slate-950 rounded-full animate-[bounce_0.5s_ease-in-out_infinite]" style={{ height: '40%' }} />
                </div>
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              <span className="text-[11px] font-semibold">
                {message.isLoadingAudio ? 'دەنگ یێ ئامادە دبیت...' : isPlayingAudio ? 'دەنگێ هەڤالی یێ لێدەت' : 'دەنگێ هەڤالی (گوهداری بکە)'}
              </span>
            </button>

            {/* Quick Heart Reaction */}
            <button
              onClick={() => setReaction(reaction === '❤️' ? null : '❤️')}
              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                reaction === '❤️'
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-800'
              }`}
              title="دڵدانان"
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
            </button>

            {/* Quick Laugh Reaction */}
            <button
              onClick={() => setReaction(reaction === '😂' ? null : '😂')}
              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                reaction === '😂'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-800'
              }`}
              title="پێکەنین"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition-colors"
              title="کۆپیکرنا پەیامێ"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
