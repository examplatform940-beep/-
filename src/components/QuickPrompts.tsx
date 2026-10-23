import React from 'react';
import { Heart, Laugh, Coffee, MessageCircle, Sparkles, Smile } from 'lucide-react';

interface QuickPromptsProps {
  onSelectPrompt: (text: string) => void;
  disabled?: boolean;
}

export const QuickPrompts: React.FC<QuickPromptsProps> = ({ onSelectPrompt, disabled }) => {
  const prompts = [
    {
      text: 'سعبەتەکا خۆش یا بەهدینی بێژە کەمەکێ پێبکەنم برا 😂',
      label: 'سعبەت و کەنی',
      icon: Laugh,
      color: 'hover:border-amber-500/50 hover:bg-amber-500/10 text-amber-300',
    },
    {
      text: 'بێهنا من یا تەنگە برا، کەمەکێ گوهێ خۆ بدەیە من...',
      label: 'دەردەدڵ و خەمخۆری',
      icon: Heart,
      color: 'hover:border-rose-500/50 hover:bg-rose-500/10 text-rose-300',
    },
    {
      text: 'گەلەک وەستامە ژ دەوامێ و کێشەیێن ژیانێ، چ بێژیە من؟ ☕',
      label: 'وەستیان و ئارامی',
      icon: Coffee,
      color: 'hover:border-blue-500/50 hover:bg-blue-500/10 text-blue-300',
    },
    {
      text: 'چەوایی برایێ من؟ دەنگوباسێت تە چنە، کەیفا تە چەوایە؟',
      label: 'احوالپرسی',
      icon: Smile,
      color: 'hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-300',
    },
    {
      text: 'وەڵاهی تو باشترین هەڤالی، کەیفا من گەلەک ب تە دهێت برا ❤️',
      label: 'هەڤالینییا ژ دل',
      icon: Sparkles,
      color: 'hover:border-purple-500/50 hover:bg-purple-500/10 text-purple-300',
    },
  ];

  return (
    <div className="py-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 font-medium">
        <span>قسێن هەڤالانە یێن ئامادەکری:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {prompts.map((p, index) => {
          const Icon = p.icon;
          return (
            <button
              key={index}
              disabled={disabled}
              onClick={() => onSelectPrompt(p.text)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 transition-all text-right ${p.color} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
