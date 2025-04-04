/**
 * سرویس تشخیص گفتار و تبدیل متن به گفتار
 * 
 * این سرویس برای تبدیل گفتار به متن و متن به گفتار استفاده می‌شود
 */

import axios from 'axios';
import config from '../config.json';
import { apiService } from './api';
import dbService from './db';

// اینترفیس تایپ‌اسکریپت برای Window
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

// تعریف تایپ‌های مورد نیاز برای Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

// تعریف تنظیمات پخش صدا
interface SpeechOptions {
  voice?: string;
  rate?: number;
  volume?: number;
  pitch?: number;
}

interface SpeechSettings {
  enabled: boolean;
  speechRate: number;
  volume: number;
  preferredVoice: string;
  useOpenAIForSpeech: boolean;
  useOpenAIForRecognition: boolean;
}

// کلاس مدیریت تبدیل گفتار به متن و متن به گفتار
export class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private synth: SpeechSynthesis | null = null;
  private isRecording: boolean = false;
  private audioContext: AudioContext | null = null;
  private audioQueue: { audioBuffer: AudioBuffer, options?: SpeechOptions }[] = [];
  private isPlaying: boolean = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private apiKey: string = '';
  private settings: SpeechSettings = {
    enabled: true,
    speechRate: 1,
    volume: 1,
    preferredVoice: 'alloy',
    useOpenAIForSpeech: true,
    useOpenAIForRecognition: true
  };

  constructor() {
    this.initializeWebSpeech();
    this.loadSettings();
    
    // بررسی تغییرات تنظیمات
    window.addEventListener('storage', (event) => {
      if (event.key === 'hooshi_config' || event.key === 'hooshi_settings') {
        this.loadSettings();
      }
    });
  }

  // بررسی پشتیبانی از تشخیص گفتار
  public isSpeechRecognitionSupported(): boolean {
    return !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  // بررسی پشتیبانی از تبدیل متن به گفتار
  public isSpeechSynthesisSupported(): boolean {
    return !!window.speechSynthesis;
  }

  // راه‌اندازی Web Speech API
  private initializeWebSpeech(): void {
    // راه‌اندازی تشخیص گفتار
    if (window.SpeechRecognition || (window as any).webkitSpeechRecognition) {
      const SpeechRecognitionAPI = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognitionAPI();
      if (this.recognition) {
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'fa-IR';
        this.recognition.maxAlternatives = 1;
      }
    } else {
      console.warn('مرورگر شما از Web Speech API پشتیبانی نمی‌کند');
    }
    
    // راه‌اندازی سنتز گفتار
    if (window.speechSynthesis) {
      this.synth = window.speechSynthesis;
    } else {
      console.warn('مرورگر شما از Speech Synthesis پشتیبانی نمی‌کند');
    }
    
    // راه‌اندازی AudioContext
    if (window.AudioContext || (window as any).webkitAudioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    } else {
      console.warn('مرورگر شما از AudioContext پشتیبانی نمی‌کند');
    }
  }

  // بارگیری تنظیمات از localStorage یا فایل کانفیگ
  private loadSettings(): void {
    // بارگیری تنظیمات از localStorage
    const storedSettings = localStorage.getItem('hooshi_settings');
    if (storedSettings) {
      try {
        const settings = JSON.parse(storedSettings);
        if (settings.speech) {
          if (typeof settings.speech.enabled === 'boolean') this.settings.enabled = settings.speech.enabled;
          if (typeof settings.speech.speechRate === 'number') this.settings.speechRate = settings.speech.speechRate;
          if (typeof settings.speech.volume === 'number') this.settings.volume = settings.speech.volume;
          if (settings.speech.preferredVoice) this.settings.preferredVoice = settings.speech.preferredVoice;
          if (typeof settings.speech.useOpenAIForSpeech === 'boolean') this.settings.useOpenAIForSpeech = settings.speech.useOpenAIForSpeech;
          if (typeof settings.speech.useOpenAIForRecognition === 'boolean') this.settings.useOpenAIForRecognition = settings.speech.useOpenAIForRecognition;
        }
        
        // بارگیری کلید API
        if (settings.openai_api_key) {
          this.apiKey = settings.openai_api_key;
        }
      } catch (error) {
        console.error('خطا در بارگیری تنظیمات گفتار از localStorage:', error);
      }
    }
    
    // اگر در localStorage نبود، از فایل کانفیگ بارگیری کن
    if (!this.apiKey && config.api_key) {
      this.apiKey = config.api_key;
    }
  }

  // تبدیل صدا به متن با استفاده از API اوپن‌ای
  private async recognizeSpeechWithOpenAI(audioBlob: Blob, conversationId?: number): Promise<string> {
    try {
      // زمان شروع درخواست
      const startTime = new Date();
      
      // اندازه فایل صدا به بایت
      const audioSizeBytes = audioBlob.size;
      
      // تخمین مدت زمان صدا (با فرض نرخ بیت متوسط 128kbps)
      const estimatedDurationSeconds = audioSizeBytes / (128 * 1024 / 8);
      
      // محاسبه هزینه تخمینی (هر دقیقه 0.006 دلار)
      const cost = (estimatedDurationSeconds / 60) * 0.006;
      
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'fa'); // زبان فارسی
      
      const response = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      // زمان پایان درخواست
      const endTime = new Date();
      const responseTimeMs = endTime.getTime() - startTime.getTime();
      
      const transcription = response.data.text;
      
      // ثبت مصرف API
      try {
        await dbService.recordApiUsage({
          endpoint: 'whisper',
          request_type: 'audio',
          response_type: 'text',
          conversation_id: conversationId,
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          request_chars: 0,
          response_chars: transcription.length,
          duration_seconds: estimatedDurationSeconds,
          model: 'whisper-1',
          cost: cost,
          notes: `Audio size: ${(audioSizeBytes / 1024).toFixed(2)}KB | Duration: ${estimatedDurationSeconds.toFixed(2)}s | Response: "${transcription.substring(0, 100)}${transcription.length > 100 ? '...' : ''}"`
        });
      } catch (logError) {
        console.error('خطا در ثبت مصرف API برای تبدیل صدا به متن:', logError);
      }
      
      return transcription;
    } catch (error) {
      console.error('خطا در تشخیص گفتار با OpenAI:', error);
      
      // ثبت خطا
      try {
        let errorMessage = 'Unknown error';
        let status = 0;
        
        if (axios.isAxiosError(error)) {
          status = error.response?.status || 0;
          errorMessage = error.response?.data?.error?.message || error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        await dbService.recordApiUsage({
          endpoint: 'whisper',
          request_type: 'audio',
          response_type: 'error',
          conversation_id: conversationId,
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          duration_seconds: 0,
          model: 'whisper-1',
          error: `${status}: ${errorMessage}`,
          cost: 0
        });
      } catch (logError) {
        console.error('خطا در ثبت خطای API برای تبدیل صدا به متن:', logError);
      }
      
      throw error;
    }
  }

  // تبدیل متن به گفتار با استفاده از API اوپن‌ای
  private async generateSpeechWithOpenAI(text: string, options: SpeechOptions = {}, conversationId?: number): Promise<ArrayBuffer> {
    try {
      // زمان شروع درخواست
      const startTime = new Date();
      
      // تخمین هزینه: هر 1000 کاراکتر حدود 0.015 دلار
      const cost = (text.length / 1000) * 0.015;
      
      const response = await axios.post(
        'https://api.openai.com/v1/audio/speech',
        {
          model: 'tts-1',
          input: text,
          voice: options.voice || this.settings.preferredVoice,
          speed: options.rate || this.settings.speechRate
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );
      
      // زمان پایان درخواست
      const endTime = new Date();
      const responseTimeMs = endTime.getTime() - startTime.getTime();
      
      // ثبت مصرف API
      try {
        await dbService.recordApiUsage({
          endpoint: 'tts',
          request_type: 'text',
          response_type: 'audio',
          conversation_id: conversationId,
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          request_chars: text.length,
          response_chars: 0,
          model: 'tts-1',
          cost: cost,
          notes: `Text length: ${text.length} chars | Voice: ${options.voice || this.settings.preferredVoice} | Speed: ${options.rate || this.settings.speechRate} | Response time: ${responseTimeMs}ms | Text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`
        });
      } catch (logError) {
        console.error('خطا در ثبت مصرف API برای تبدیل متن به گفتار:', logError);
      }
      
      return response.data;
    } catch (error) {
      console.error('خطا در تبدیل متن به گفتار با OpenAI:', error);
      
      // ثبت خطا
      try {
        let errorMessage = 'Unknown error';
        let status = 0;
        
        if (axios.isAxiosError(error)) {
          status = error.response?.status || 0;
          errorMessage = error.response?.data?.error?.message || error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        await dbService.recordApiUsage({
          endpoint: 'tts',
          request_type: 'text',
          response_type: 'error',
          conversation_id: conversationId,
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          request_chars: text.length,
          model: 'tts-1',
          error: `${status}: ${errorMessage}`,
          cost: 0
        });
      } catch (logError) {
        console.error('خطا در ثبت خطای API برای تبدیل متن به گفتار:', logError);
      }
      
      throw error;
    }
  }

  // شروع ضبط صدا با قابلیت OpenAI
  public async startRecording(
    onSuccess: (text: string) => void,
    onError: (error: string) => void
  ): Promise<boolean> {
    // بررسی تنظیمات برای استفاده از OpenAI
    const useOpenAI = this.settings.useOpenAIForRecognition;
    
    if (useOpenAI) {
      try {
        // ضبط صدا با MediaRecorder
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks: Blob[] = [];
        
        mediaRecorder.addEventListener('dataavailable', (event) => {
          audioChunks.push(event.data);
        });
        
        mediaRecorder.addEventListener('stop', async () => {
          // تبدیل چانک‌ها به یک فایل صوتی
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          
          try {
            // تشخیص گفتار با OpenAI
            const transcript = await this.recognizeSpeechWithOpenAI(audioBlob);
            onSuccess(transcript);
          } catch (error) {
            onError('خطا در تشخیص گفتار با OpenAI: ' + (error as Error).message);
          } finally {
            // آزادسازی منابع
            stream.getTracks().forEach(track => track.stop());
          }
        });
        
        // شروع ضبط
        mediaRecorder.start();
        
        // زمان ضبط: 10 ثانیه
        setTimeout(() => {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }, 10000);
        
        this.isRecording = true;
        return true;
      } catch (error) {
        console.error('خطا در دسترسی به میکروفون:', error);
        onError('خطا در دسترسی به میکروفون: ' + (error as Error).message);
        return false;
      }
    } else {
      // استفاده از Web Speech API استاندارد
      if (!this.recognition) {
        onError('مرورگر شما از تشخیص گفتار پشتیبانی نمی‌کند');
        return false;
      }

      if (this.isRecording) {
        this.stopRecording();
      }

      try {
        this.isRecording = true;

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
          const result = event.results[event.resultIndex];
          if (result.isFinal) {
            const transcript = result[0].transcript.trim();
            console.log('نتیجه تشخیص گفتار:', transcript);
            onSuccess(transcript);
          }
        };

        this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          this.isRecording = false;
          console.error('خطای تشخیص گفتار:', event.error);
          let errorMessage = 'خطا در تشخیص گفتار';
          
          switch (event.error) {
            case 'no-speech':
              errorMessage = 'صدایی شنیده نشد';
              break;
            case 'aborted':
              errorMessage = 'ضبط صدا متوقف شد';
              break;
            case 'audio-capture':
              errorMessage = 'مشکل در دسترسی به میکروفون';
              break;
            case 'network':
              errorMessage = 'خطای اتصال به شبکه';
              break;
            case 'not-allowed':
            case 'service-not-allowed':
              errorMessage = 'دسترسی به میکروفون مجاز نیست';
              break;
            case 'bad-grammar':
            case 'language-not-supported':
              errorMessage = 'زبان پشتیبانی نمی‌شود';
              break;
          }
          
          onError(errorMessage);
        };

        this.recognition.onend = () => {
          this.isRecording = false;
          console.log('ضبط صدا به پایان رسید');
        };

        this.recognition.start();
        return true;
      } catch (error) {
        this.isRecording = false;
        console.error('خطا در شروع ضبط صدا:', error);
        onError('خطا در شروع ضبط صدا');
        return false;
      }
    }
  }

  // توقف ضبط صدا
  public stopRecording(): void {
    if (this.recognition && this.isRecording) {
      try {
        this.recognition.stop();
        this.isRecording = false;
      } catch (error) {
        console.error('خطا در توقف ضبط صدا:', error);
      }
    }
  }

  // پخش متن با تبدیل به گفتار
  public async speak(text: string, options: SpeechOptions = {}, conversationId?: number): Promise<void> {
    if (!text || !this.settings.enabled) return;
    
    // استفاده از API اوپن‌ای
    if (this.settings.useOpenAIForSpeech && this.apiKey) {
      try {
        // تبدیل متن به گفتار با API اوپن‌ای
        const audioData = await this.generateSpeechWithOpenAI(text, options, conversationId);
        
        // پخش صدا با Web Audio API
        await this.playAudioWithWebAudio(audioData, options);
      } catch (error) {
        console.error('خطا در پخش صدا با OpenAI:', error);
        // پخش با Web Speech API به عنوان پشتیبان
        this.speakWithWebSpeech(text, options);
      }
    } else {
      // استفاده از Web Speech API استاندارد
      this.speakWithWebSpeech(text, options);
    }
  }

  // پخش متن با استفاده از Web Speech API استاندارد
  private speakWithWebSpeech(text: string, options: SpeechOptions = {}): void {
    if (!this.synth) {
      console.warn('مرورگر شما از تبدیل متن به گفتار پشتیبانی نمی‌کند');
      return;
    }
    
    // توقف هرگونه پخش در حال انجام
    this.synth.cancel();
    
    // ایجاد یک نمونه گفتار جدید
    const utterance = new SpeechSynthesisUtterance(text);
    
    // تنظیم زبان به فارسی
    utterance.lang = 'fa-IR';
    
    // تنظیمات پخش
    utterance.rate = options.rate || this.settings.speechRate;
    utterance.volume = options.volume || this.settings.volume;
    utterance.pitch = options.pitch || 1;
    
    // انتخاب صدا اگر موجود باشد
    if (options.voice && this.synth.getVoices().length > 0) {
      const voices = this.synth.getVoices();
      const voice = voices.find(v => v.name.toLowerCase().includes(options.voice?.toLowerCase() || ''));
      if (voice) {
        utterance.voice = voice;
      }
    }
    
    // شروع پخش
    this.synth.speak(utterance);
  }

  // پخش صدا با Web Audio API
  private async playAudioWithWebAudio(audioData: ArrayBuffer, options: SpeechOptions = {}): Promise<void> {
    if (!this.audioContext) {
      console.warn('مرورگر شما از Web Audio API پشتیبانی نمی‌کند');
      return;
    }
    
    try {
      // تبدیل داده‌های باینری به AudioBuffer
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      
      // افزودن به صف پخش
      this.audioQueue.push({ audioBuffer, options });
      
      // شروع پخش اگر در حال پخش نیست
      if (!this.isPlaying) {
        this.playNextInQueue();
      }
    } catch (error) {
      console.error('خطا در پخش صدا با Web Audio API:', error);
    }
  }

  // پخش صدای بعدی در صف
  private playNextInQueue(): void {
    if (this.audioQueue.length === 0 || !this.audioContext) {
      this.isPlaying = false;
      return;
    }
    
    this.isPlaying = true;
    
    const { audioBuffer, options } = this.audioQueue.shift()!;
    
    // ایجاد منبع صدا
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // ایجاد کنترل‌کننده صدا
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = options?.volume || this.settings.volume;
    
    // اتصال به خروجی
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // ذخیره منبع فعلی
    this.currentSource = source;
    
    // شروع پخش
    source.start();
    
    // پخش صدای بعدی در صف وقتی این صدا تمام شد
    source.onended = () => {
      this.currentSource = null;
      this.playNextInQueue();
    };
  }

  // توقف پخش صدا
  public stopSpeaking(): void {
    // توقف Web Speech API
    if (this.synth) {
      this.synth.cancel();
    }
    
    // توقف Web Audio API
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (error) {
        console.error('خطا در توقف پخش صدا:', error);
      }
    }
    
    // پاک کردن صف پخش
    this.audioQueue = [];
    this.isPlaying = false;
  }

  // بررسی اینکه آیا در حال پخش صدا است
  public isSpeaking(): boolean {
    return (this.synth && this.synth.speaking) || this.isPlaying;
  }
}

// ایجاد یک نمونه واحد از سرویس
const speechService = new SpeechService();
export default speechService; 