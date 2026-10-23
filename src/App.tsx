import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  ExternalLink,
  Smartphone,
  X,
  Copy,
  Check,
  Youtube,
  MessageCircle,
  Send,
  Sparkles,
  KeyRound,
  Mic,
  AlertCircle,
  HelpCircle,
  Hand,
  Radio,
} from 'lucide-react';
import { AssistantAction, SocialCommentItem, ActiveMedia } from './types';
import { sfx } from './utils/audio';
import ElevenLabsModal from './components/ElevenLabsModal';

const WELCOME_TEXT = 'سڵاڤ برا! ئەز گوێداریا تە دکەم ل سەر مۆبایلێ، هەر فەرمانەکا هەبیت فەرموو ب دەنگی بێژە.';

const ANDROID_MANIFEST_CODE = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.honar.voiceassistant">

    <!-- دەستهەڵاتێن سەرەکی یێن اینترنت و دەنگی -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="هەڤالێ بەهدینی"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.AppCompat.Light.NoActionBar">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".VoiceBackgroundService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="microphone" />

    </application>
</manifest>`;

const QUICK_PROMPTS = [
  { label: 'یوتیوبێ ڤەکە و سترانێ لێدە', text: 'یوتیوبێ ڤەکە و ل ڤێ سترانێ بگەرە سترانا بەهدینی' },
  { label: 'سڵاڤ برا، چەوانی؟', text: 'سڵاڤ برایێ من، ئەڤرۆ چەوانی؟ دەمێ تە باش.' },
  { label: 'سعبەتەکێ بێژە کەمەکێ پێبکەنم', text: 'بۆ من سعبەتەکێ بێژە کەمەکێ پێبکەنم' },
  { label: 'کۆمێنتێ بنڤیسە: دەستخۆش', text: 'ل ڤی پۆستی کۆمێنتێ ڤەکە و بنڤیسە: دەستێن تە خۆش بن ماموستا، گەلەک جوانە!' },
  { label: 'تێلێگرامێ ڤەکە', text: 'تێلێگرامێ ڤەکە و نامەکێ بنڤیسە' },
  { label: 'واتسئەپێ ڤەکە', text: 'واتسئەپێ ڤەکە و پەیامێ بنڤیسە' },
];

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [statusText, setStatusText] = useState('بۆ دەستپێکرنێ ل دوگمەی بدە یان دەست ل سەر بگرە');
  const [subStatus, setSubStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);

  // Interaction Mode: 'toggle' (tap to start / tap or silence to finish) vs 'hold' (press and hold to speak)
  const [talkMode, setTalkMode] = useState<'toggle' | 'hold'>('toggle');

  // Modals & Panels
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [showElevenLabsModal, setShowElevenLabsModal] = useState(false);
  const [showMobileTips, setShowMobileTips] = useState(false);
  const [showInputBar, setShowInputBar] = useState(false);
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ElevenLabs Key & Settings
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState(() => {
    return localStorage.getItem('elevenlabs_api_key') || '';
  });
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState(() => {
    return localStorage.getItem('elevenlabs_voice_id') || '21m00Tcm4TlvDq8ikWAM';
  });
  const [elevenLabsModelId, setElevenLabsModelId] = useState(() => {
    return localStorage.getItem('elevenlabs_model_id') || 'eleven_multilingual_v2';
  });
  const [isTestingAudio, setIsTestingAudio] = useState(false);

  // Dynamic Audio Visualization Bars (Real microphone volume)
  const [barHeights, setBarHeights] = useState<number[]>([10, 10, 10, 10, 10]);
  const [audioInputLevel, setAudioInputLevel] = useState<number>(0);

  // Active Actions
  const [activeMedia, setActiveMedia] = useState<ActiveMedia | null>(null);
  const [latestComment, setLatestComment] = useState<SocialCommentItem | null>(null);

  // Audio & Recording Refs
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<any>(null);
  const hasSpokenRef = useRef<boolean>(false);
  const isRecordingRef = useRef<boolean>(false);
  const recordingStartTimeRef = useRef<number>(0);

  // Keep ref up to date
  isRecordingRef.current = isRecording;

  // WakeLock request to keep mobile screen alive
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch {}
    };
    requestWakeLock();
    return () => {
      if (wakeLock) wakeLock.release();
    };
  }, []);

  // Notification request
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const sendNotification = (title: string, body: string) => {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon.png' });
      }
    } catch {}
  };

  // Safe Audio Context starter for Mobile Browsers
  const getOrCreateAudioContext = () => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioContextRef.current && AudioCtx) {
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  // Text-To-Speech Playback with ElevenLabs or Gemini
  const handlePlayTTS = async (text: string) => {
    if (!autoSpeak) return;

    setIsSpeaking(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          elevenLabsApiKey: elevenLabsApiKey.trim() || undefined,
          voiceId: elevenLabsVoiceId || undefined,
          modelId: elevenLabsModelId || undefined,
        }),
      });

      if (!res.ok) throw new Error('TTS failed');

      const data = await res.json();
      if (data.audioBase64) {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
        }

        const mime = data.mimeType || 'audio/wav';
        const audio = new Audio(`data:${mime};base64,${data.audioBase64}`);
        currentAudioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          currentAudioRef.current = null;
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          currentAudioRef.current = null;
        };

        await audio.play();
        return;
      }
    } catch {
      // Browser SpeechSynthesis fallback
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-SA';
        utterance.rate = 0.95;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        return;
      }
    }
    setIsSpeaking(false);
  };

  // Direct Execution of YouTube Action for Mobile & Desktop
  const executeYouTubeAction = (queryText: string) => {
    const cleanQuery = queryText
      .replace(/(?:یوتیوبێ|یوتیوب|يوتيوب|ڤەکە|بۆ من|تکایە|بگەرە|لێدە|و|ل)+/gi, ' ')
      .trim();

    const searchQuery = cleanQuery && cleanQuery.length > 1 ? cleanQuery : 'سترانێن بەهدینی';
    const webUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    
    // Set active media state so mobile card is permanently accessible
    setActiveMedia({
      query: searchQuery,
      url: webUrl,
      isOpen: true,
    });

    sendNotification('یوتیوب هاتە ڤەکرن', `لێگەڕیان: ${searchQuery}`);

    // Attempt direct open (works if in touch event chain)
    try {
      window.open(webUrl, '_blank');
    } catch {}

    const reply = `تمام ماموستا، نوکە ل سەر مۆبایلێ یوتیوبێ بۆ تە دڤەکەم و ل "${searchQuery}" دگەڕم برا!`;
    setStatusText(reply);
    setSubStatus('یوتیوب ئامادەیە • کلیک لێ بکە بۆ ڤەکرنێ');
    sfx.playCompanionChime();

    if (autoSpeak) {
      handlePlayTTS(reply);
    }
  };

  // Process text prompt via /api/chat
  const handleUserTextCommand = async (spokenText: string) => {
    if (!spokenText.trim()) return;
    setStatusText(`تە گۆت: "${spokenText}"`);
    setSubStatus('د بەرسڤدانێ دایە...');
    setIsLoading(true);

    // Direct YouTube trigger
    if (spokenText.includes('یوتیوب') || spokenText.includes('يوتيوب') || spokenText.toLowerCase().includes('youtube')) {
      setIsLoading(false);
      executeYouTubeAction(spokenText);
      return;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: spokenText }),
      });

      const data = await res.json();
      const reply = data.reply || 'تمام ماموستا، ئەز د خزمەتا تەمە.';
      const action: AssistantAction | null = data.action || null;

      setStatusText(reply);
      setSubStatus('بەرسڤ هاتە دان');

      if (action) {
        if (action.type === 'OPEN_YOUTUBE') {
          executeYouTubeAction(action.query || 'سترانێن بەهدینی');
          return;
        } else if (action.type === 'POST_COMMENT') {
          const commentText = action.commentText || 'دەستێن تە خۆش بن ماموستا!';
          navigator.clipboard.writeText(commentText);
          setLatestComment({
            id: 'c-' + Date.now(),
            platform: action.platform || 'tiktok',
            commentText,
            status: 'posted',
            timestamp: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
          });
          sendNotification('کۆمێنت هاتە نڤیسین', commentText);
        } else if (action.type === 'OPEN_MESSENGER') {
          const msg = encodeURIComponent(action.message || '');
          const isTg = action.app === 'telegram';
          const deepLink = isTg ? `tg://msg_url?url=${msg}` : `whatsapp://send?text=${msg}`;
          const webUrl = isTg ? `https://t.me/share/url?url=${msg}` : `https://wa.me/?text=${msg}`;
          try {
            window.open(deepLink, '_blank');
          } catch {
            window.open(webUrl, '_blank');
          }
        }
      }

      sfx.playCompanionChime();
      if (autoSpeak) {
        handlePlayTTS(reply);
      }
    } catch {
      const fallback = 'سەرسەرا هۆنەرێ من، ئەز ل گەل تەمە و گوھداریا تە دکەم برا!';
      setStatusText(fallback);
      if (autoSpeak) {
        handlePlayTTS(fallback);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Send Recorded Audio to Multimodal Gemini Badini Voice Input (/api/voice-input)
  const processRecordedAudio = async (audioBlob: Blob, mimeType: string) => {
    if (audioBlob.size < 800) {
      setStatusText('دەنگ زۆر کورت بوو! تکایە دەست ل دوگمەی بگرە و باخڤە.');
      setSubStatus('دووبارە بکەوە');
      return;
    }

    setIsLoading(true);
    setStatusText('🎙️ دەنگ هاتە وەرگرتن... د شیکردنەوە و بەرسڤدانێ دایە');
    setSubStatus('مۆبایل گوێداری کر...');

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const dataUrl = await base64Promise;

      const res = await fetch('/api/voice-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: dataUrl,
          mimeType: mimeType || 'audio/webm',
        }),
      });

      if (!res.ok) throw new Error('Voice input request failed');

      const data = await res.json();
      const transcript = data.transcript || '';
      const reply = data.reply || 'سەرسەرا ماموستا!';
      const action = data.action || null;

      if (transcript && transcript !== 'دەنگێ مۆبایلێ' && transcript !== 'دەنگ هاتە وەرگرتن') {
        setStatusText(`تە گۆت: "${transcript}"\n\n${reply}`);
      } else {
        setStatusText(reply);
      }
      setSubStatus('بەرسڤ هاتە دان');

      // Execute Action
      if (action) {
        if (action.type === 'OPEN_YOUTUBE') {
          executeYouTubeAction(action.query || 'سترانێن بەهدینی');
          return;
        } else if (action.type === 'POST_COMMENT') {
          const commentText = action.commentText || 'دەستخۆش ماموستا!';
          navigator.clipboard.writeText(commentText);
          setLatestComment({
            id: 'c-' + Date.now(),
            platform: action.platform || 'tiktok',
            commentText,
            status: 'posted',
            timestamp: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
          });
          sendNotification('کۆمێنت هاتە نڤیسین', commentText);
        } else if (action.type === 'OPEN_MESSENGER') {
          const msg = encodeURIComponent(action.message || '');
          const isTg = action.app === 'telegram';
          const webUrl = isTg ? `https://t.me/share/url?url=${msg}` : `https://wa.me/?text=${msg}`;
          try {
            window.open(webUrl, '_blank');
          } catch {}
        }
      }

      sfx.playCompanionChime();
      if (autoSpeak) {
        handlePlayTTS(reply);
      }
    } catch (err) {
      console.error('Audio process error:', err);
      setStatusText('هەڤالێ من، کێشەیەک ڕوویدا. تکایە جارەکا دی باخڤە برا.');
      setSubStatus('کێشە د ناردنی دا');
    } finally {
      setIsLoading(false);
    }
  };

  // Start Real Microphone Capture on Mobile
  const startRecording = async () => {
    // Clear any previous state
    setMicPermissionError(null);
    hasSpokenRef.current = false;
    recordedChunksRef.current = [];

    // Stop existing audio playback to avoid mic feedback
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);

    try {
      // 1. Request microphone with mobile-optimized constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      // 2. Setup Web Audio Analyser for Real Live Volume Visualizer
      const audioCtx = getOrCreateAudioContext();
      if (audioCtx) {
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        // Visualizer Loop
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateMeter = () => {
          if (!mediaStreamRef.current) return;
          analyser.getByteFrequencyData(dataArray);

          // Calculate average volume
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avg = sum / bufferLength;
          setAudioInputLevel(avg);

          // Map frequency bins to 5 waveform bars
          const b1 = Math.min(50, Math.max(10, (dataArray[2] || 0) * 0.22));
          const b2 = Math.min(50, Math.max(10, (dataArray[5] || 0) * 0.25));
          const b3 = Math.min(50, Math.max(10, (dataArray[8] || 0) * 0.28));
          const b4 = Math.min(50, Math.max(10, (dataArray[11] || 0) * 0.25));
          const b5 = Math.min(50, Math.max(10, (dataArray[14] || 0) * 0.22));
          setBarHeights([b1, b2, b3, b4, b5]);

          // Voice Activity Detection (VAD)
          if (avg > 18) {
            hasSpokenRef.current = true;
            setSubStatus('دەنگێ تە دهێت... گوھداریا تە دکەم 🟢');
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
          } else if (hasSpokenRef.current && isRecordingRef.current) {
            // User spoke and is now quiet
            if (!silenceTimerRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                // If user paused for 1.4 seconds in toggle mode, auto-submit!
                if (talkMode === 'toggle' && isRecordingRef.current) {
                  stopRecordingAndProcess();
                }
              }, 1400);
            }
          }

          animFrameRef.current = requestAnimationFrame(updateMeter);
        };

        animFrameRef.current = requestAnimationFrame(updateMeter);
      }

      // 3. Setup MediaRecorder with best supported mimeType on Mobile
      let selectedMime = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          selectedMime = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          selectedMime = 'audio/mp4'; // Native iOS Safari format
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          selectedMime = 'audio/aac';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          selectedMime = 'audio/webm';
        }
      }

      const recorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : undefined);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(recordedChunksRef.current, { type: selectedMime });
        processRecordedAudio(fullBlob, selectedMime);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // Slice every 250ms

      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      setIsConnected(true);
      setStatusText('🎙️ فەرموو باخڤە... ئەز ب زاراڤێ بەهدینی گوھداریا تەمە');
      setSubStatus('مایکرۆفۆنێ مۆبایلێ کارا بوو');
      sfx.playCompanionChime();
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setIsRecording(false);
      setIsConnected(false);
      setMicPermissionError(
        'دەستووریا مایکرۆفۆنێ (Microphone Permission) نەهاتیە دان ل مۆبایلێ. تکایە دەست ل دوگمەیا ڕێپێدانێ بدە دا دەنگێ تە بهێت.'
      );
      setStatusText('مایکرۆفۆن نەهاتە ڤەکرن! دەستووریێ ل مۆبایلێ بدە.');
    }
  };

  // Stop Recording & Trigger processing
  const stopRecordingAndProcess = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
    setIsConnected(false);
    setBarHeights([10, 10, 10, 10, 10]);
  };

  // Primary Action Button Handler (Supports both tap and hold)
  const handleButtonTap = () => {
    if (isLoading) return;

    if (isRecording) {
      // User tapped while recording -> finish & process
      stopRecordingAndProcess();
    } else {
      // User tapped while idle -> start recording
      startRecording();
    }
  };

  // Touch Down / Hold to speak (Walkie-Talkie style on mobile)
  const handlePointerDown = () => {
    if (talkMode === 'hold' && !isRecording && !isLoading) {
      startRecording();
    }
  };

  const handlePointerUp = () => {
    if (talkMode === 'hold' && isRecording) {
      // Check if held for at least 400ms
      const duration = Date.now() - recordingStartTimeRef.current;
      if (duration > 400) {
        stopRecordingAndProcess();
      } else {
        // Accidental fast click, keep brief record or stop
        setTimeout(() => stopRecordingAndProcess(), 800);
      }
    }
  };

  const handleSendInput = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    handleUserTextCommand(text);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeySaved = (key: string, voiceId: string, modelId: string) => {
    setElevenLabsApiKey(key);
    setElevenLabsVoiceId(voiceId);
    setElevenLabsModelId(modelId);
  };

  const handleTestElevenLabsVoice = async (testKey: string, testVoiceId: string, testModelId: string) => {
    setIsTestingAudio(true);
    try {
      const testSentence = 'سڵاڤ هونەر برایێ من! ئەڤە دەنگێ بەهدینی یێ شیرینە ل سەر مۆبایلێ.';
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testSentence,
          elevenLabsApiKey: testKey.trim(),
          voiceId: testVoiceId,
          modelId: testModelId,
        }),
      });

      if (!res.ok) throw new Error('TTS test failed');
      const data = await res.json();
      if (data.audioBase64) {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (currentAudioRef.current) currentAudioRef.current.pause();

        const mime = data.mimeType || 'audio/mpeg';
        const audio = new Audio(`data:${mime};base64,${data.audioBase64}`);
        currentAudioRef.current = audio;
        setIsSpeaking(true);

        audio.onended = () => {
          setIsSpeaking(false);
          setIsTestingAudio(false);
          currentAudioRef.current = null;
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          setIsTestingAudio(false);
          currentAudioRef.current = null;
        };
        await audio.play();
      }
    } catch (err) {
      console.error('Audio test failed:', err);
    } finally {
      setIsTestingAudio(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0f172a] text-white flex flex-col items-center justify-between p-3 sm:p-4 md:p-6 select-none font-['Vazirmatn',Arial,sans-serif] relative touch-manipulation">
      {/* Top Header Controls */}
      <div className="w-full max-w-xl flex items-center justify-between pt-1 z-20 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs sm:text-sm font-bold text-slate-200">هەڤالێ بەهدینی</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border transition-colors ${
              isRecording
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 animate-pulse'
                : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
            }`}
          >
            {isRecording ? 'گوێدارە...' : 'ئامادەیە'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* ElevenLabs API Key Modal Button */}
          <button
            onClick={() => setShowElevenLabsModal(true)}
            className={`px-2.5 py-1 text-xs rounded-full border transition-all flex items-center gap-1 active:scale-95 ${
              elevenLabsApiKey.trim()
                ? 'bg-purple-600/25 border-purple-500/50 text-purple-300 hover:bg-purple-600/35 shadow-sm shadow-purple-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="بوکسێ کلیلا ElevenLabs"
          >
            <KeyRound className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-semibold text-[11px] sm:text-xs">ElevenLabs</span>
            {elevenLabsApiKey.trim() && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* Toggle Talk Mode (Tap vs Hold) */}
          <button
            onClick={() => setTalkMode(talkMode === 'toggle' ? 'hold' : 'toggle')}
            className="px-2 py-1 text-[11px] rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-1"
            title="گوهۆڕینا شێوازێ دەنگی"
          >
            {talkMode === 'toggle' ? (
              <>
                <Radio className="w-3 h-3 text-emerald-400" />
                <span>تەپ (Tap)</span>
              </>
            ) : (
              <>
                <Hand className="w-3 h-3 text-amber-400" />
                <span>گرتن (Hold)</span>
              </>
            )}
          </button>

          {/* Text Input Toggle */}
          <button
            onClick={() => setShowInputBar(!showInputBar)}
            className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
              showInputBar
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            نڤیسین
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            title={autoSpeak ? 'دەنگ: ڤەکری' : 'دەنگ: گرتی'}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Mobile Tips Help */}
          <button
            onClick={() => setShowMobileTips(true)}
            className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-sky-400 transition-colors"
            title="ڕێنمایێن مۆبایلێ"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Android APK Modal */}
          <button
            onClick={() => setShowAndroidModal(true)}
            className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-emerald-400 transition-colors"
            title="AndroidManifest.xml"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mic Permission Warning Banner (if denied on mobile) */}
      {micPermissionError && (
        <div className="w-full max-w-md mt-2 p-3 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-center justify-between gap-2 z-30 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{micPermissionError}</span>
          </div>
          <button
            onClick={startRecording}
            className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shrink-0 text-xs"
          >
            ڕێپێدان
          </button>
        </div>
      )}

      {/* Center VPN / Siri Style Big Power/Mic Button */}
      <div className="container flex flex-col items-center justify-center my-auto text-center z-10 max-w-md w-full px-2">
        {/* The Big Central Siri/VPN Button with Touch Support */}
        <div className="relative">
          {/* Active Voice Energy Ring */}
          {isRecording && (
            <div
              className="absolute -inset-4 rounded-full bg-emerald-500/20 blur-md animate-ping"
              style={{ animationDuration: '2s' }}
            />
          )}

          <button
            id="micBtn"
            onClick={talkMode === 'toggle' ? handleButtonTap : undefined}
            onPointerDown={talkMode === 'hold' ? handlePointerDown : undefined}
            onPointerUp={talkMode === 'hold' ? handlePointerUp : undefined}
            onPointerLeave={talkMode === 'hold' && isRecording ? handlePointerUp : undefined}
            className={`mic-button ${isRecording ? 'connected' : ''} ${isLoading ? 'animate-pulse' : ''}`}
            style={{
              background: isRecording
                ? 'linear-gradient(135deg, #22c55e, #15803d)'
                : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              boxShadow: isRecording
                ? `0 0 ${35 + Math.min(30, audioInputLevel)}px rgba(34, 197, 94, 0.9)`
                : '0 0 25px rgba(59, 130, 246, 0.5)',
              transform: isRecording ? `scale(${1 + Math.min(0.08, audioInputLevel / 200)})` : 'scale(1)',
            }}
            title={
              talkMode === 'hold'
                ? 'دەست ل سەر بگرە دەمێ دئاخڤی'
                : isRecording
                ? 'بۆ ڕاوەستاندنێ لێ بدە'
                : 'بۆ دەستپێکرنێ لێ بدە'
            }
          >
            {isLoading ? (
              <span className="text-4xl animate-spin">⏳</span>
            ) : (
              <span className="mic-icon text-4xl">🎙️</span>
            )}
          </button>
        </div>

        {/* Real-Time Live Waveforms Animated to Mobile Microphone Decibels */}
        <div id="waveform" className={`waveform ${isRecording || isSpeaking ? 'active' : ''}`}>
          {barHeights.map((h, i) => (
            <div
              key={i}
              className="bar"
              style={{
                height: `${h}px`,
                backgroundColor: isRecording ? '#22c55e' : '#38bdf8',
                boxShadow: isRecording ? '0 0 10px #4ade80' : '0 0 8px #38bdf8',
                transition: 'height 0.08s ease',
              }}
            />
          ))}
        </div>

        {/* Substatus indicator (shows if voice is detected) */}
        {subStatus && (
          <div className="mt-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-3 py-0.5 rounded-full border border-emerald-500/20 animate-in fade-in">
            {subStatus}
          </div>
        )}

        {/* Main Status Text (Spoken prompt & Badini reply) */}
        <div
          id="statusText"
          className="status-text font-medium text-base mt-3 px-3 whitespace-pre-line leading-relaxed"
          style={{
            color: isRecording ? '#4ade80' : '#cbd5e1',
          }}
        >
          {statusText}
        </div>

        {/* Action Button for YouTube on Mobile (Guaranteed to bypass Mobile Popup Blockers) */}
        {activeMedia && (
          <div className="mt-3 w-full max-w-sm p-3 rounded-2xl bg-gradient-to-r from-red-950/80 to-slate-900 border border-red-500/50 shadow-lg shadow-red-950/50 animate-in zoom-in-95">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <Youtube className="w-5 h-5 text-red-400 shrink-0 animate-bounce" />
                <div className="text-right truncate">
                  <div className="text-[11px] text-red-300 font-semibold">یوتیوب ئامادەیە</div>
                  <div className="text-xs text-white font-bold truncate">{activeMedia.query}</div>
                </div>
              </div>
              <a
                href={activeMedia.url}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-red-600/40 shrink-0"
              >
                <span>ڤەکە ل مۆبایلێ</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* TikTok / Instagram Comment Copy Toast */}
        {latestComment && (
          <div className="mt-2 flex items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-200 text-xs animate-in fade-in w-full max-w-sm">
            <div className="flex items-center gap-2 truncate">
              <MessageCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="truncate">کۆمێنت: {latestComment.commentText}</span>
            </div>
            <button
              onClick={() => handleCopyText('comment', latestComment.commentText)}
              className="px-2 py-1 rounded bg-cyan-800/70 text-cyan-100 hover:bg-cyan-700 text-[11px] font-bold flex items-center gap-1"
            >
              {copiedId === 'comment' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>کۆپی</span>
            </button>
          </div>
        )}

        {/* Quick Badini Suggestions Chips */}
        <div className="mt-4 w-full">
          <div className="text-[11px] text-slate-400 mb-1.5 flex items-center justify-center gap-1 font-medium">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>بۆ ئەنجامدانا دەستبەجێ یا فەرمانان لێبدە:</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5 max-h-24 sm:max-h-28 overflow-y-auto p-1">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleUserTextCommand(prompt.text)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 border border-slate-700/60 text-[11px] text-slate-200 hover:text-white transition-all text-center"
              >
                {prompt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Optional Manual Text Input Bar */}
      {showInputBar && (
        <form
          onSubmit={handleSendInput}
          className="w-full max-w-md flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/95 border border-slate-700 backdrop-blur-md mb-2 z-20"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="ب زاراڤێ بەهدینی بنڤیسە..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            dir="rtl"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors"
          >
            <Send className="w-4 h-4 rtl:rotate-180" />
          </button>
        </form>
      )}

      {/* Bottom Hint */}
      <div className="text-center pb-2 text-[11px] text-slate-400 z-10 flex flex-col items-center gap-1">
        <p>
          {talkMode === 'hold'
            ? 'دەست ل سەر دوگمەی بگرە و باخڤە، پاشی دەردە دا بنێریت'
            : 'ل دوگمەی بدە بۆ ئاخفتنێ • بەردەوام ل باکگراوندێ گوێداریا تە دکەت'}
        </p>
      </div>

      {/* Mobile Instructions Modal */}
      {showMobileTips && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl p-5 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">چەوانیا بکارئینانێ ل سەر مۆبایلێ</h3>
              </div>
              <button onClick={() => setShowMobileTips(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold">1</div>
                <div>
                  <div className="font-bold text-white">ڕێپێدانا مایکرۆفۆنێ (Mic Permission)</div>
                  <p className="text-slate-400 mt-0.5">دەمێ دەست ل دوگمەیا شین ددەی، مۆبایل داخوازییا ڕێپێدانێ دکەت، ل سەر &quot;Allow&quot; یان &quot;سماح&quot; بدە.</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold">2</div>
                <div>
                  <div className="font-bold text-white">شێوازێ ئاخفتنێ (Voice Modes)</div>
                  <p className="text-slate-400 mt-0.5">دشێی شێوازێ &quot;تەپ&quot; بکاربینی (جارەکێ لێبدە و باخڤە) یان &quot;گرتن&quot; (دەست ل سەر دوگمەی بگرە دەمێ دئاخڤی).</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 font-bold">3</div>
                <div>
                  <div className="font-bold text-white">ڤەکرنا یوتیوبێ ل مۆبایلێ</div>
                  <p className="text-slate-400 mt-0.5">دەمێ دبێژی &quot;یوتیوبێ ڤەکە&quot;، دوگمەیەکا سۆر پەیدا دبیت و دەستبەجێ بەرنامێ یوتیوبێ ل سەر مۆبایلێ ڤەدکەت.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowMobileTips(false)}
              className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              تێگەهشتم، دەستپێبکە
            </button>
          </div>
        </div>
      )}

      {/* ElevenLabs Key Modal */}
      <ElevenLabsModal
        isOpen={showElevenLabsModal}
        onClose={() => setShowElevenLabsModal(false)}
        onKeySaved={handleKeySaved}
        onTestVoice={handleTestElevenLabsVoice}
        currentKey={elevenLabsApiKey}
        currentVoiceId={elevenLabsVoiceId}
        currentModelId={elevenLabsModelId}
        isTestingAudio={isTestingAudio}
      />

      {/* Android Manifest & APK Export Modal */}
      {showAndroidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">AndroidManifest.xml • هەڤالێ بەهدینی</h3>
              </div>
              <button
                onClick={() => setShowAndroidModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-emerald-300 text-[11px]">package=&quot;com.honar.voiceassistant&quot;</span>
                <button
                  onClick={() => handleCopyText('manifest', ANDROID_MANIFEST_CODE)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1"
                >
                  {copiedId === 'manifest' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>کۆپی</span>
                </button>
              </div>

              <pre className="p-3 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto text-left dir-ltr">
                {ANDROID_MANIFEST_CODE}
              </pre>

              <div className="pt-2 flex flex-wrap gap-2">
                <a
                  href="/android/AndroidManifest.xml"
                  download="AndroidManifest.xml"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1.5"
                >
                  <span>دابەزاندنا AndroidManifest.xml</span>
                </a>
                <a
                  href="/android/MainActivity.kt"
                  download="MainActivity.kt"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1.5"
                >
                  <span>MainActivity.kt</span>
                </a>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-center">
              <button
                onClick={() => setShowAndroidModal(false)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
              >
                داخستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
