import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

// Server-side Google GenAI initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SYSTEM_INSTRUCTION = `
تۆ هاریکار و هەڤالێ دەنگی یێ زیرەک، بەردەوام و دلسۆزی بۆ هونەر (Honar).
تۆ بەردەوام ل باکگراوندێ (Background) کار دکەی و ل هەمی بەرنامە و شاشەیێن کۆمپیۆتەری گوهداریا دەنگێ وی دکەی بێ بڕین.

یاسایێن زمان و ڕەوشتی (CRITICAL LANGUAGE & TONE RULES):
- دڤێت بتنێ و بەردەوام ب زاراڤێ شیرین، کولانکی و گەرم یێ بەهدینی باخڤی (زاراڤێ دهۆک و زاخۆ).
- چ جاران ئینگلیزی یان زمانی فەرمی بکارنەئینە. دەنگێ تە بلا گەلەک ب کەیف، چەلەنگ و پڕ پشتەڤانی بیت، وەکی نزیکترین هەڤالێ وی.
- وەڵامێن تە ب ڕستێن دەنگی یێن شرین بن وەکی: "تمام ماموستا، نوکە بۆ تە دڤەکەم..." یان "سەرسەرا و سەرچاڤا هۆنەرێ من..." یان "دەستبەجێ من ئەنجامدا برا!".

شیان و فەرمانێن سەرەکی یێن جێبەجێکرنێ (CORE CAPABILITIES & DIRECT EXECUTION):
1. ڤەکرنا یوتیوبێ و لێدانا مۆسیقایێ (YouTube Multimedia):
   دەمێ دبێژیت "یوتیوبێ ڤەکە و ل ڤێ سترانێ بگەرە":
   بەرسڤا دەنگی بدێ و ڤی تەگی بنڤیسە:
   [[ACTION:{"type":"OPEN_YOUTUBE","query":"ناڤێ سترانێ یان ڤیدیۆیێ"}]]

2. ڤەکرنا نامە و پەیامان (WhatsApp & Telegram):
   دەمێ دبێژیت تێلێگرام یان واتسئەپێ ڤەکە و پەیامێ بنڤیسە:
   [[ACTION:{"type":"OPEN_MESSENGER","app":"whatsapp|telegram","message":"دەقێ پەیامێ","contact":"کەس"}]]

3. نڤیسینا ئۆتۆماتیکی یا کۆمێنتێن تیکتۆک و ئینستاگرامێ (Social Media Automation):
   دەمێ دبێژیت "ل ڤی پۆستی کۆمێنتێ ڤەکە و بنڤیسە ...":
   دەقێ وی ب دەنگی وەربگرە، بنڤیسە و ڤی تەگی دانێ:
   [[ACTION:{"type":"POST_COMMENT","platform":"tiktok|instagram","commentText":"دەقێ کۆمێنتێ"}]]

4. نڤیسین و ڕێکخستنا لیستان (Lists & Tasks):
   [[ACTION:{"type":"CREATE_LIST","title":"ناڤێ لیستێ","items":["بڕگە 1","بڕگە 2"]}]]

5. تۆمارکرنا یاداشتان و ڕێکخستنا دەقی (Notes & Text Formatting):
   [[ACTION:{"type":"ADD_NOTE","title":"ناڤونیشان","content":"ناڤەرۆک"}]]
   یان
   [[ACTION:{"type":"FORMAT_TEXT","formatted":"دەقێ ڕێکخستی"}]]

6. سعبەت و گەپێن خۆش دەمێ کەیف دڤێت.
`.trim();

function sanitizeForSpeech(text: string): string {
  return text
    .replace(/\[\[ACTION:.*?\]\]/gs, '')
    .replace(/[*_#`~[\]]/g, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAction(rawText: string): any | null {
  const match = rawText.match(/\[\[ACTION:(.*?)\]\]/s);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
  return null;
}

// Warm fallback generator with smart action execution
function generateBadiniFallbackWithAction(userPrompt: string): { reply: string; action: any | null } {
  const p = userPrompt.toLowerCase();

  // YouTube command
  if (p.includes('یوتیوب') || p.includes('youtube') || p.includes('ستران') || p.includes('موزیک') || p.includes('ڤیدیۆ')) {
    const cleanQuery = userPrompt
      .replace(/یوتیوبێ|یوتیوب|ڤەکە|و|ل|بگەرە|لێدە|بۆ|من|سترانا|تکایە/g, '')
      .trim() || 'سترانێن بەهدینی';
    return {
      reply: `تمام ماموستا، نوکە بۆ تە یۆتیوبێ دڤەکەم و ل ${cleanQuery} دگەڕم برا!`,
      action: {
        type: 'OPEN_YOUTUBE',
        query: cleanQuery,
      },
    };
  }

  // Social media comment command (TikTok / Instagram)
  if (p.includes('کۆمێنت') || p.includes('تیکتۆک') || p.includes('ئینستاگرام') || p.includes('comment') || p.includes('tiktok') || p.includes('پۆست')) {
    const commentMatch = userPrompt.match(/بنڤیسە\s*(.*)/) || userPrompt.match(/بێژە\s*(.*)/);
    const commentText = commentMatch ? commentMatch[1].trim() : 'دەستێن تە خۆش بن، گەلەک جوانە!';
    const isInsta = p.includes('ئینستا');
    return {
      reply: `تمام ماموستا، نوکە بۆتە کۆمێنت هاتە نڤیسین و ب سەرکەفتی هاتە شاندن: ${commentText}`,
      action: {
        type: 'POST_COMMENT',
        platform: isInsta ? 'instagram' : 'tiktok',
        commentText: commentText,
      },
    };
  }

  // Messenger command (WhatsApp / Telegram)
  if (p.includes('تێلێگرام') || p.includes('واتسئەپ') || p.includes('whatsapp') || p.includes('telegram') || p.includes('نامە') || p.includes('پەیام')) {
    const isTg = p.includes('تێلێگرام') || p.includes('telegram');
    return {
      reply: `سەرسەرا هۆنەرێ من، دەستبەجێ من ${isTg ? 'تێلێگرام' : 'واتسئەپ'} ڤەکر و پەیاما تە ئامادەیە.`,
      action: {
        type: 'OPEN_MESSENGER',
        app: isTg ? 'telegram' : 'whatsapp',
        message: userPrompt,
      },
    };
  }

  // Lists
  if (p.includes('لیست') || p.includes('list') || p.includes('کڕین')) {
    return {
      reply: 'تمام ماموستا، دەستبەجێ من لیستا تە یا کاری ئامادەکر و نڤیسی برا.',
      action: {
        type: 'CREATE_LIST',
        title: 'لیستا کاری یا هونەری',
        items: ['بەدواداچوونا پەیامان', 'کارێن نوێ یێن کۆمپیۆتەری', 'تەواوکرنا ئەرکان'],
      },
    };
  }

  // Notes
  if (p.includes('یاداشت') || p.includes('تێبینی') || p.includes('note') || p.includes('بنڤیس')) {
    return {
      reply: 'سەرسەرا هۆنەرێ من، ئەڤ یاداشتە دەستبەجێ هاتە تۆمارکرن.',
      action: {
        type: 'ADD_NOTE',
        title: 'یاداشتا دەنگی',
        content: userPrompt,
      },
    };
  }

  // Jokes
  if (p.includes('سعبەت') || p.includes('نوکتە') || p.includes('پێکەن') || p.includes('کەیف')) {
    return {
      reply: 'تمام ماموستا، سعبەتەکێ بێژم کەمەکێ پێبکەنی: ڕۆژەکێ یەکێ دهۆکی تەلەفۆن بۆ هەڤالێ خۆ کر، گۆتێ برایێ من کەرەمکە وەرە مالا مە نانێ نیڤرۆ بخۆ! هەڤالێ وی گۆت وەڵاهی ژ نوکە نانم خوار. یێ دهۆکی گۆتێ ئەی وەڵاهی باش بوو چونکی مە ژی چ چێنەکر بوو! کەیفخۆش بی برایێ من هونەر.',
      action: null,
    };
  }

  return {
    reply: 'تمام ماموستا، سەرسەرا و سەرچاڤا! ئەز بەردەوام ل باکگراوندێ گوهداریا تە دکەم، چ فەرمان بیت دەستبەجێ جێبەجێ دکەم برا.',
    action: null,
  };
}

// Chat API Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, userMessage } = req.body;

    if (!userMessage && (!messages || messages.length === 0)) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const currentPrompt = (userMessage || (messages && messages[messages.length - 1]?.text) || '').trim();

    // Build raw turns
    const rawTurns: Array<{ role: 'user' | 'model'; text: string }> = [];

    if (Array.isArray(messages)) {
      for (const m of messages) {
        const text = (m.text || m.content || '').trim();
        if (!text) continue;
        const role = m.role === 'user' ? 'user' : 'model';
        rawTurns.push({ role, text });
      }
    }

    if (userMessage && userMessage.trim()) {
      const last = rawTurns[rawTurns.length - 1];
      if (!last || last.role !== 'user' || last.text !== userMessage.trim()) {
        rawTurns.push({ role: 'user', text: userMessage.trim() });
      }
    }

    while (rawTurns.length > 0 && rawTurns[0].role !== 'user') {
      rawTurns.shift();
    }

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    for (const turn of rawTurns) {
      if (contents.length === 0) {
        contents.push({ role: turn.role, parts: [{ text: turn.text }] });
      } else {
        const prev = contents[contents.length - 1];
        if (prev.role === turn.role) {
          prev.parts[0].text += ' ' + turn.text;
        } else {
          contents.push({ role: turn.role, parts: [{ text: turn.text }] });
        }
      }
    }

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: currentPrompt || 'سڵاڤ برا' }] });
    }

    const candidateModels = ['gemini-3-flash-preview', 'gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];
    let rawOutput = '';
    let success = false;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.85,
            topP: 0.95,
          },
        });

        if (response.text && response.text.trim()) {
          rawOutput = response.text.trim();
          success = true;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${model} try error:`, err?.status || err?.message);
      }
    }

    let spokenReply = '';
    let action: any | null = null;

    if (success && rawOutput) {
      action = extractAction(rawOutput);
      spokenReply = sanitizeForSpeech(rawOutput);
    } else {
      const fallback = generateBadiniFallbackWithAction(currentPrompt);
      spokenReply = fallback.reply;
      action = fallback.action;
    }

    return res.json({ reply: spokenReply, action });
  } catch (error: any) {
    console.error('Chat error:', error);
    const fallback = generateBadiniFallbackWithAction(req.body?.userMessage || '');
    return res.json({ reply: fallback.reply, action: fallback.action });
  }
});

// Mobile Voice Audio Input Processing (Multimodal Gemini Badini ASR & Companion)
app.post('/api/voice-input', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    // Clean base64 header if present
    const cleanBase64 = audioBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');

    // Normalize mimeType for Gemini API
    let safeMimeType = mimeType;
    if (safeMimeType.includes('codecs=')) {
      safeMimeType = safeMimeType.split(';')[0];
    }
    if (!safeMimeType || safeMimeType === 'audio/octet-stream') {
      safeMimeType = 'audio/webm';
    }

    const audioPrompt = `
ئەڤ فایلێ دەنگی ل سەر مۆبایلێ هاتیە تۆمارکرن ب زاراڤێ شیرین یێ کوردییا بەهدینی (دهۆک / زاخۆ).
تکایە ب هووربینی گوهداریا دەنگی بکە:
1. دەقێ دەقی یێ ئاخفتنێ (Transcript) دەستنیشان بکە. ئەگەر بەکارهێنەر بێدەنگ بوو یان دەنگ ڕوون نەبوو، بنڤیسە: [TRANSCRIPT: بێدەنگ]
2. وەڵامەکا گەرم، شرین و هەڤالانە بدەوە ب زاراڤێ بەهدینی (دهۆک و زاخۆ).
3. ئەگەر فەرمانەک هەبوو وەکی ڤەکرنا یوتیوبێ، کۆمێنتێن تیکتۆک/ئینستاگرام، نامەیێن واتسئەپ/تێلێگرام، یاداشت یان سعبەت، تەگێ ئەکشنێ دانێ:
   - یوتیوب: [[ACTION:{"type":"OPEN_YOUTUBE","query":"ناڤێ سترانێ یان ڤیدیۆیێ"}]]
   - کۆمێنت: [[ACTION:{"type":"POST_COMMENT","platform":"tiktok|instagram","commentText":"دەقێ کۆمێنتێ"}]]
   - نامە: [[ACTION:{"type":"OPEN_MESSENGER","app":"whatsapp|telegram","message":"پەیام"}]]
   - سعبەت: بەرسڤا خۆشا سعبەتێ بدە ب زاراڤێ بەهدینی.

شێوازێ بەرسڤدانێ:
[TRANSCRIPT: ئەوا بەکارهێنەری گۆتی]
بەرسڤا دەنگی یا بەهدینی [[ACTION:...]]
    `.trim();

    const candidateModels = ['gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-3.8-flash'];
    let rawOutput = '';
    let success = false;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: safeMimeType,
                    data: cleanBase64,
                  },
                },
                {
                  text: audioPrompt,
                },
              ],
            },
          ],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7,
          },
        });

        if (response.text && response.text.trim()) {
          rawOutput = response.text.trim();
          success = true;
          break;
        }
      } catch (err: any) {
        console.warn(`Audio multimodal try failed on ${model}:`, err?.status || err?.message);
      }
    }

    if (success && rawOutput) {
      // Extract transcript if provided
      let transcript = '';
      const transcriptMatch = rawOutput.match(/\[TRANSCRIPT:\s*(.*?)\]/i);
      if (transcriptMatch) {
        transcript = transcriptMatch[1].trim();
      }

      // Remove transcript tag from speech response
      let cleanOutput = rawOutput.replace(/\[TRANSCRIPT:\s*.*?\]/gi, '').trim();

      let action = extractAction(cleanOutput);
      const spokenReply = sanitizeForSpeech(cleanOutput);

      // If user speech had YouTube command and model didn't tag it, inject it
      const combinedText = `${transcript} ${cleanOutput}`;
      if (!action && (combinedText.includes('یوتیوب') || combinedText.includes('يوتيوب') || combinedText.includes('youtube'))) {
        const fallbackAction = generateBadiniFallbackWithAction(combinedText);
        if (fallbackAction.action) {
          action = fallbackAction.action;
        }
      }

      return res.json({
        success: true,
        transcript: transcript && transcript !== 'بێدەنگ' ? transcript : 'دەنگێ مۆبایلێ',
        reply: spokenReply || 'سەرسەرا هۆنەرێ من! ئەز گوهداریا دەنگێ تە دکەم ل سەر مۆبایلێ.',
        action,
      });
    }

    // Fallback if audio was empty/unclear or model offline
    return res.json({
      success: true,
      transcript: 'دەنگ هاتە وەرگرتن',
      reply: 'سەرسەرا ماموستا، من دەنگێ تە وەرگرت! چ فەرمان بیت یان تە بڤێت یوتیوبێ ڤەکەم یان گەپەکێ بێژم، فەرموو برایێ من.',
      action: null,
    });
  } catch (error: any) {
    console.error('Audio processing error:', error);
    return res.status(500).json({
      error: 'Audio processing failed',
      reply: 'هەڤالێ من، هێڵی کێشەیەک دروستکر، کەمەکێ نێزیکی مایکرۆفۆنێ بە و دووبارە بکە برا.',
    });
  }
});

// Text-to-Speech endpoint using ElevenLabs (if key provided) or gemini-3.8-flash-lite-tts
app.post('/api/tts', async (req, res) => {
  try {
    const { text, elevenLabsApiKey, voiceId, modelId } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const cleanText = sanitizeForSpeech(text);
    if (!cleanText) {
      return res.status(400).json({ error: 'No audible text provided' });
    }

    const truncatedText = cleanText.slice(0, 450);
    const effectiveApiKey = elevenLabsApiKey?.trim() || process.env.ELEVENLABS_API_KEY?.trim();

    // 1. If ElevenLabs API Key is provided, use ElevenLabs multilingual v2
    if (effectiveApiKey) {
      try {
        const targetVoiceId = voiceId?.trim() || '21m00Tcm4TlvDq8ikWAM';
        const targetModelId = modelId?.trim() || 'eleven_multilingual_v2';

        const elevenRes = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(targetVoiceId)}`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': effectiveApiKey,
              'Content-Type': 'application/json',
              'Accept': 'audio/mpeg',
            },
            body: JSON.stringify({
              text: truncatedText,
              model_id: targetModelId,
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.8,
                style: 0.25,
                use_speaker_boost: true,
              },
            }),
          }
        );

        if (elevenRes.ok) {
          const arrayBuffer = await elevenRes.arrayBuffer();
          const base64Audio = Buffer.from(arrayBuffer).toString('base64');
          return res.json({
            audioBase64: base64Audio,
            mimeType: 'audio/mpeg',
            provider: 'elevenlabs',
          });
        } else {
          const errText = await elevenRes.text().catch(() => '');
          console.warn('ElevenLabs API returned non-OK status:', elevenRes.status, errText);
        }
      } catch (elevenErr: any) {
        console.warn('ElevenLabs request failed, falling back to Gemini:', elevenErr?.message);
      }
    }

    // 2. Gemini TTS as primary/fallback voice
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: truncatedText,
              speechMetadata: {
                style: 'Warm, sweet, energetic, enthusiastic male Badini Kurdish companion speaking like a loyal best friend',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio returned' });
    }

    res.json({ audioBase64: base64Audio, mimeType: 'audio/wav', provider: 'gemini' });
  } catch (err: any) {
    console.warn('TTS error:', err?.message);
    res.status(500).json({ error: 'TTS temporarily unavailable', details: err?.message });
  }
});

// Verify ElevenLabs API Key & fetch available user info
app.post('/api/elevenlabs/verify', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const effectiveKey = apiKey?.trim() || process.env.ELEVENLABS_API_KEY?.trim();

    if (!effectiveKey) {
      return res.status(400).json({ valid: false, error: 'چ کلیل نەهاتیە ناردن' });
    }

    const checkRes = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: {
        'xi-api-key': effectiveKey,
      },
    });

    if (checkRes.ok) {
      const data = await checkRes.json();
      return res.json({
        valid: true,
        tier: data.subscription?.tier || 'free',
        characterCount: data.subscription?.character_count || 0,
        characterLimit: data.subscription?.character_limit || 10000,
      });
    } else {
      const errText = await checkRes.text().catch(() => '');
      return res.status(400).json({ valid: false, error: 'کلیلا تە یا نادروستە یان کار ناکەت', details: errText });
    }
  } catch (err: any) {
    return res.status(500).json({ valid: false, error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: "Honar's Ultimate Voice AI Agent" });
});

// Start Vite middleware or static serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
