import axios from 'axios';
import config from '../config.json';
import dbService from './db';

// تعریف ساختار پیام‌های چت
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// تعریف ساختار پاسخ OpenAI
interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// تعریف ساختار درخواست به OpenAI
interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

// ساختار قیمت‌گذاری مدل‌های OpenAI (به دلار)
interface ModelPricing {
  [key: string]: {
    input?: number;    // قیمت هر 1000 توکن ورودی
    output?: number;   // قیمت هر 1000 توکن خروجی
  }
}

// قیمت‌های فعلی مدل‌ها (بر اساس مستندات OpenAI)
const MODEL_PRICING: ModelPricing = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4-vision-preview': { input: 0.01, output: 0.03 },
  'gpt-4-32k': { input: 0.06, output: 0.12 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gpt-3.5-turbo-16k': { input: 0.001, output: 0.002 },
  'whisper-1': { input: 0.006 }, // قیمت هر دقیقه
  'tts-1': { output: 0.015 },    // قیمت هر 1000 کاراکتر
  'tts-1-hd': { output: 0.03 },  // قیمت هر 1000 کاراکتر
  'dall-e-3': { output: 0.04 },  // قیمت هر تصویر (استاندارد 1024×1024)
  'dall-e-2': { output: 0.02 },  // قیمت هر تصویر (استاندارد 1024×1024)
};

// محاسبه هزینه تخمینی استفاده از API OpenAI
function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const defaultModel = 'gpt-3.5-turbo';
  const pricing = MODEL_PRICING[model] || MODEL_PRICING[defaultModel];
  
  // محاسبه هزینه توکن‌های ورودی
  const inputCost = (promptTokens / 1000) * (pricing.input || 0);
  
  // محاسبه هزینه توکن‌های خروجی
  const outputCost = (completionTokens / 1000) * (pricing.output || 0);
  
  // مجموع هزینه
  return inputCost + outputCost;
}

// تنظیمات پیش‌فرض برای تماس با API
const DEFAULT_OPTIONS = {
  model: 'gpt-4-turbo',
  temperature: 0.7,
  max_tokens: 1000
};

export class ApiService {
  private baseUrl: string;
  private apiKey: string = '';
  private systemMessage: ChatMessage = {
    role: 'system',
    content: ''
  };

  constructor() {
    this.baseUrl = 'https://api.openai.com/v1/chat/completions';
    // دریافت API کلید از فایل کانفیگ یا localStorage
    this.loadConfig();
    
    // تنظیم پیام سیستمی
    this.updateSystemMessage();
    
    // بررسی تغییرات تنظیمات
    window.addEventListener('storage', (event) => {
      if (event.key === 'hooshi_config' || event.key === 'hooshi_settings') {
        this.loadConfig();
        this.updateSystemMessage();
      }
    });
  }
  
  // بارگذاری تنظیمات از localStorage یا فایل کانفیگ
  private loadConfig(): void {
    try {
      // تلاش برای بارگذاری کانفیگ از localStorage
      const storedConfig = localStorage.getItem('hooshi_config');
      
      if (storedConfig) {
        try {
          const configObj = JSON.parse(storedConfig);
          this.apiKey = configObj.api_key || config.api_key;
          console.log('API کلید از localStorage بارگذاری شد');
        } catch (error) {
          console.error('خطا در پارس کردن کانفیگ ذخیره شده:', error);
          this.apiKey = config.api_key || '';
        }
      } else {
        this.apiKey = config.api_key || '';
      }
    } catch (error) {
      console.error('خطا در بارگذاری کانفیگ API:', error);
      this.apiKey = config.api_key || '';
    }
  }
  
  // به‌روزرسانی پیام سیستمی با توجه به تنظیمات فعلی
  private updateSystemMessage(): void {
    // تنظیمات نام کاربر و دستیار
    let userName = config.default_user_name || 'کاربر';
    let assistantName = config.default_assistant_name || 'هوشی';
    
    // بررسی تنظیمات در localStorage
    const storedSettings = localStorage.getItem('hooshi_settings');
    if (storedSettings) {
      try {
        const settings = JSON.parse(storedSettings);
        userName = settings.userName || userName;
        assistantName = settings.assistantName || assistantName;
      } catch (error) {
        console.error('خطا در پارس کردن تنظیمات:', error);
      }
    }
    
    // پیام سیستمی برای تعریف نقش دستیار
    this.systemMessage = {
      role: 'system',
      content: `شما ${assistantName}، یک دستیار هوشمند مشاوره املاک در ایران هستید که به فارسی صحبت می‌کنید.
      شما باید به کاربران در زمینه‌های زیر کمک کنید:
      1. جستجوی ملک مناسب با توجه به بودجه، منطقه و ویژگی‌های مورد نظر
      2. مشاوره در مورد قیمت‌ها و شرایط بازار املاک در ایران
      3. ارائه اطلاعات مفید درباره محله‌ها، مناطق و شرایط خرید، فروش و اجاره
      4. پاسخگویی به سوالات رایج در زمینه مسائل حقوقی، قانونی و مالیاتی مرتبط با املاک
      
      مهم: لحن شما باید خودمانی و صمیمی باشد. از عبارات رسمی مثل "می‌باشد"، "هستید" و "می‌توانید" خودداری کنید و به جای آنها از "هست"، "هستی" و "می‌تونی" استفاده کنید.
      
      همیشه کاربر را با نام "${userName}" خطاب کنید (مگر اینکه خودش نام دیگری معرفی کند) و خودتان را "${assistantName}" معرفی کنید.
      
      در پاسخ‌های خود به ارائه اطلاعات دقیق و راهنمایی‌های عملی تمرکز کنید.
      از ایموجی‌ها در مواقع مناسب استفاده کنید تا گفتگو دوستانه‌تر شود.
      
      ${config.prioritize_memory ? 'مهم: به حافظه و گفتگوهای قبلی کاربر اهمیت زیادی دهید و در پاسخ‌های خود به آنها استناد کنید. سعی کنید اطلاعاتی که قبلاً کاربر به شما داده را به خاطر داشته باشید.' : ''}
      
      اگر کاربر سوالی خارج از حوزه تخصصی شما پرسید، محترمانه بگویید که اطلاعات کافی ندارید و تلاش کنید بحث را به سمت موضوع املاک هدایت کنید.`
    };
  }
  
  /**
   * ارسال پیام کاربر به API و دریافت پاسخ
   * @param userMessage پیام کاربر
   * @param conversation تاریخچه مکالمه (اختیاری)
   * @param conversationId شناسه گفتگو (اختیاری)
   */
  async sendMessage(userMessage: string, conversation: ChatMessage[] = [], conversationId?: number): Promise<string> {
    // بررسی وجود API کلید
    if (!this.apiKey) {
      console.warn('API key not found. Using mock responses.');
      
      // ثبت استفاده از پاسخ شبیه‌سازی شده
      await this.recordMockUsage(userMessage, conversationId);
      
      return this.getMockResponse(userMessage, conversation);
    }
    
    // ساخت آرایه پیام‌ها با افزودن پیام سیستمی، تاریخچه و پیام جدید کاربر
    const messages = [
      this.systemMessage,
      ...conversation,
      { role: 'user', content: userMessage } as ChatMessage
    ];

    // زمان شروع درخواست
    const startTime = new Date();
    
    try {
      // مدل انتخاب شده
      const model = DEFAULT_OPTIONS.model;
      
      // ارسال درخواست به API
      const response = await axios.post<OpenAIResponse>(
        this.baseUrl,
        {
          ...DEFAULT_OPTIONS,
          messages
        } as ChatCompletionRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      // زمان پایان درخواست
      const endTime = new Date();
      const responseTimeMs = endTime.getTime() - startTime.getTime();
      
      // اطلاعات مصرف توکن
      const usage = response.data.usage;
      
      // محاسبه هزینه تخمینی
      const cost = calculateCost(model, usage.prompt_tokens, usage.completion_tokens);
      
      // استخراج پاسخ
      const responseContent = response.data.choices[0].message.content;
      
      // ایجاد خلاصه محتوا برای ثبت در لاگ
      const userMessageSummary = userMessage.length > 100 ? 
        userMessage.substring(0, 97) + '...' : userMessage;
      
      const responseSummary = responseContent.length > 100 ? 
        responseContent.substring(0, 97) + '...' : responseContent;
      
      // ثبت مصرف API با اطلاعات بیشتر
      await this.recordApiUsage({
        endpoint: 'chat',
        request_type: 'text',
        response_type: 'text',
        conversation_id: conversationId,
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        request_chars: userMessage.length,
        response_chars: responseContent.length,
        model: model,
        cost: cost,
        notes: `Response time: ${responseTimeMs}ms | Request: "${userMessageSummary}" | Response: "${responseSummary}"`
      });

      // بازگشت پاسخ
      return responseContent;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      
      // ثبت خطا
      await this.recordApiError(error, userMessage, conversationId);
      
      // در صورت خطا، از پاسخ‌های پیش‌فرض استفاده کن
      return 'متأسفانه در برقراری ارتباط با API مشکلی پیش اومده. میشه دوباره تلاش کنی؟';
    }
  }

  /**
   * ثبت خطای API
   * @param error خطای رخ داده
   * @param userMessage پیام کاربر
   * @param conversationId شناسه گفتگو (اختیاری)
   */
  private async recordApiError(error: any, userMessage: string, conversationId?: number): Promise<void> {
    try {
      let errorMessage = 'Unknown error';
      let status = 0;
      
      if (axios.isAxiosError(error)) {
        status = error.response?.status || 0;
        errorMessage = error.response?.data?.error?.message || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      await this.recordApiUsage({
        endpoint: 'chat',
        request_type: 'text',
        response_type: 'error',
        conversation_id: conversationId,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        request_chars: userMessage.length,
        model: DEFAULT_OPTIONS.model,
        error: `${status}: ${errorMessage}`,
        cost: 0
      });
    } catch (dbError) {
      console.error('خطا در ثبت خطای API:', dbError);
    }
  }

  /**
   * ثبت استفاده از پاسخ شبیه‌سازی شده
   * @param userMessage پیام کاربر
   * @param conversationId شناسه گفتگو (اختیاری)
   */
  private async recordMockUsage(userMessage: string, conversationId?: number): Promise<void> {
    try {
      // تخمین مصرف توکن بر اساس طول متن
      const estimatedPromptTokens = Math.ceil(userMessage.length / 4);
      const estimatedCompletionTokens = Math.ceil(estimatedPromptTokens * 1.5); // تخمین پاسخ حدود 1.5 برابر ورودی
      
      await this.recordApiUsage({
        endpoint: 'chat',
        request_type: 'text',
        response_type: 'mock',
        conversation_id: conversationId,
        prompt_tokens: estimatedPromptTokens,
        completion_tokens: estimatedCompletionTokens,
        total_tokens: estimatedPromptTokens + estimatedCompletionTokens,
        request_chars: userMessage.length,
        model: 'mock-response',
        cost: 0,
        notes: 'Simulated response (no API call)'
      });
    } catch (dbError) {
      console.error('خطا در ثبت استفاده از پاسخ شبیه‌سازی شده:', dbError);
    }
  }

  /**
   * ثبت مصرف API با استفاده از سرویس دیتابیس
   * @param usageData اطلاعات مصرف API
   */
  private async recordApiUsage(usageData: Omit<import('./db').ApiUsageRecord, 'id' | 'timestamp'>): Promise<void> {
    try {
      await dbService.recordApiUsage(usageData);
    } catch (error) {
      console.error('خطا در ثبت مصرف API:', error);
    }
  }

  /**
   * ارسال صدا به API برای تبدیل به متن
   * @param audioBlob فایل صدا
   * @param conversationId شناسه گفتگو (اختیاری)
   */
  async transcribeAudio(audioBlob: Blob, conversationId?: number): Promise<string> {
    // بررسی وجود API کلید
    if (!this.apiKey) {
      console.warn('API key not found. Cannot transcribe audio.');
      return '';
    }
    
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'fa'); // زبان فارسی
    
    // زمان شروع درخواست
    const startTime = new Date();
    
    try {
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
      
      // اندازه فایل صدا به بایت
      const audioSizeBytes = audioBlob.size;
      
      // تخمین مدت زمان صدا (با فرض نرخ بیت متوسط 128kbps)
      const estimatedDurationSeconds = audioSizeBytes / (128 * 1024 / 8);
      
      // محاسبه هزینه تخمینی (هر دقیقه 0.006 دلار)
      const cost = (estimatedDurationSeconds / 60) * 0.006;
      
      // ثبت مصرف API
      await this.recordApiUsage({
        endpoint: 'transcription',
        request_type: 'audio',
        response_type: 'text',
        conversation_id: conversationId,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        request_chars: 0,
        response_chars: response.data.text.length,
        duration_seconds: estimatedDurationSeconds,
        model: 'whisper-1',
        cost: cost,
        notes: `Audio size: ${(audioSizeBytes / 1024).toFixed(2)}KB, Response time: ${responseTimeMs}ms`
      });
      
      return response.data.text;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      
      // ثبت خطا
      let errorMessage = 'Unknown error';
      let status = 0;
      
      if (axios.isAxiosError(error)) {
        status = error.response?.status || 0;
        errorMessage = error.response?.data?.error?.message || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      await this.recordApiUsage({
        endpoint: 'transcription',
        request_type: 'audio',
        response_type: 'error',
        conversation_id: conversationId,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        duration_seconds: audioBlob.size / (128 * 1024 / 8), // تخمین مدت زمان صدا
        model: 'whisper-1',
        error: `${status}: ${errorMessage}`,
        cost: 0
      });
      
      throw error;
    }
  }

  /**
   * تبدیل متن به صدا
   * @param text متن برای تبدیل به صدا
   * @param conversationId شناسه گفتگو (اختیاری)
   */
  async generateSpeech(text: string, conversationId?: number): Promise<ArrayBuffer> {
    // بررسی وجود API کلید
    if (!this.apiKey) {
      console.warn('API key not found. Cannot generate speech.');
      throw new Error('API key not found.');
    }
    
    // زمان شروع درخواست
    const startTime = new Date();
    
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/audio/speech',
        {
          model: 'tts-1',
          input: text,
          voice: 'alloy' // صدای انتخابی
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
      
      // محاسبه هزینه تخمینی (هر 1000 کاراکتر 0.015 دلار)
      const cost = (text.length / 1000) * 0.015;
      
      // ثبت مصرف API
      await this.recordApiUsage({
        endpoint: 'tts',
        request_type: 'text',
        response_type: 'audio',
        conversation_id: conversationId,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        request_chars: text.length,
        model: 'tts-1',
        cost: cost,
        notes: `Audio size: ${(response.data.byteLength / 1024).toFixed(2)}KB, Response time: ${responseTimeMs}ms`
      });
      
      return response.data;
    } catch (error) {
      console.error('Error generating speech:', error);
      
      // ثبت خطا
      let errorMessage = 'Unknown error';
      let status = 0;
      
      if (axios.isAxiosError(error)) {
        status = error.response?.status || 0;
        errorMessage = error.response?.data?.error?.message || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      await this.recordApiUsage({
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
      
      throw error;
    }
  }

  /**
   * پاسخ‌های پیش‌فرض برای زمانی که API در دسترس نیست
   */
  private getMockResponse(input: string, conversation: ChatMessage[] = []): string {
    // پیدا کردن نام کاربر از مکالمات قبلی
    let userName = config.default_user_name || 'عزیز';
    if (config.prioritize_memory && conversation.length > 0) {
      // جستجو برای یافتن نام کاربر در گفتگو
      const namePattern = /من\s+(\S+)\s+هستم|اسمم\s+(\S+)\s+است|(\S+)\s+هستم/i;
      
      for (const msg of conversation) {
        if (msg.role === 'user') {
          const match = msg.content.match(namePattern);
          if (match) {
            // استفاده از اولین گروه غیر خالی
            userName = match[1] || match[2] || match[3];
            break;
          }
        }
      }
    }
    
    // پاسخ‌های پیش‌فرض براساس کلمات کلیدی در متن ورودی
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('سلام') || lowerInput.includes('خوبی')) {
      return `👋 سلام ${userName}! من هوشی، دستیار املاک تو هستم. چطور می‌تونم امروز کمکت کنم؟`;
    }
    
    // بررسی تاریخچه گفتگو برای ارائه پاسخ‌های شخصی‌تر
    if (config.prioritize_memory && conversation.length > 0) {
      // بررسی آیا کاربر قبلاً درباره منطقه خاصی پرسیده است
      let mentionedArea = '';
      let mentionedBudget = '';
      
      for (const msg of conversation) {
        if (msg.role === 'user') {
          const areaPattern = /(منطقه|محله|ناحیه|شهرک)\s+(\d+|[آ-ی]+)/i;
          const areaMatch = msg.content.match(areaPattern);
          
          if (areaMatch) {
            mentionedArea = areaMatch[2];
          }
          
          const budgetPattern = /(\d+)\s+(میلیون|میلیارد)/i;
          const budgetMatch = msg.content.match(budgetPattern);
          
          if (budgetMatch) {
            mentionedBudget = `${budgetMatch[1]} ${budgetMatch[2]}`;
          }
        }
      }
      
      // استفاده از اطلاعات قبلی برای پاسخ
      if (mentionedArea && (lowerInput.includes('قیمت') || lowerInput.includes('آپارتمان') || lowerInput.includes('خرید'))) {
        return `با توجه به علاقه‌ت به منطقه ${mentionedArea}، می‌تونم بگم که الان قیمت‌ها در این منطقه متنوعه. ${mentionedBudget ? `با بودجه ${mentionedBudget} می‌تونی واحدهای نسبتاً خوبی پیدا کنی.` : 'اگه بودجه‌ت رو بگی، می‌تونم دقیق‌تر راهنماییت کنم.'} می‌خوای جزئیات بیشتری درباره گزینه‌های موجود بدونی؟`;
      }
    }
    
    if (lowerInput.includes('قیمت') || lowerInput.includes('آپارتمان') || lowerInput.includes('خرید')) {
      return `قیمت املاک بستگی به منطقه، متراژ و سن بنا داره. در مناطق شمالی تهران، قیمت آپارتمان نوساز از متری 40 تا 100 میلیون تومان متغیره. برای اطلاعات دقیق‌تر، میشه بگی کدوم منطقه و چه متراژی مد نظرته؟`;
    }
    
    if (lowerInput.includes('اجاره') || lowerInput.includes('رهن')) {
      return `برای اجاره در تهران، با توجه به منطقه و شرایط ملک، هزینه‌ها متفاوته. در مناطق مرکزی، معمولاً رهن کامل یک آپارتمان 75 متری حدود 300 تا 700 میلیون تومانه. برای اجاره ماهیانه هم باید بین 10 تا 30 میلیون تومان (بسته به میزان پیش پرداخت) در نظر بگیری. منطقه خاصی مد نظرته ${userName}؟`;
    }
    
    if (lowerInput.includes('وام') || lowerInput.includes('تسهیلات')) {
      return `در حال حاضر، بانک‌ها وام‌های مختلفی برای خرید مسکن ارائه می‌دن. وام اوراق حدود 480 میلیون تومانه که البته با نرخ سود 18 درصد محاسبه میشه. همچنین وام خرید از طریق صندوق پس‌انداز مسکن یکم هم گزینه دیگه‌ای هست. برای اطلاعات دقیق‌تر، بهتره به شعب بانک‌های مسکن مراجعه کنی. می‌خوای درباره شرایط دریافت وام بیشتر بدونی؟`;
    }
    
    if (lowerInput.includes('منطقه') || lowerInput.includes('محله')) {
      return `منطقه 1 (شمال تهران) شامل محله‌هایی مثل نیاوران، فرمانیه و زعفرانیه از گرون‌ترین مناطقه. مناطق 2 و 3 هم قیمت‌های بالایی دارن. مناطق مرکزی مثل 6 و 7 متعادل‌تر هستن. مناطق جنوبی‌تر مثل 14، 15 و 20 قیمت‌های مناسب‌تری دارن. برای انتخاب محله مناسب، علاوه بر قیمت، باید به دسترسی به حمل و نقل عمومی، مراکز خرید و فضای سبز هم توجه کنی. به نظرت کدوم یکی از این فاکتورها برات مهم‌تره؟`;
    }
    
    if (lowerInput.includes('پیش‌بینی') || lowerInput.includes('آینده') || lowerInput.includes('بازار')) {
      return `😊 راستش پیش‌بینی دقیق بازار مسکن همیشه سخته، ولی با توجه به روند تورم و تغییرات اقتصادی، به نظر میاد تو ماه‌های آینده افزایش ملایم قیمت‌ها ادامه داشته باشه. البته این روند تو مناطق مختلف فرق داره و تو برخی مناطق ممکنه با رکود معاملات همراه باشه. توصیه می‌کنم اگه قصد خرید داری، تصمیمت رو فقط براساس نیاز واقعی بگیری و از خرید صرفاً با هدف سرمایه‌گذاری کوتاه‌مدت خودداری کنی. نظرت چیه؟`;
    }
    
    if (lowerInput.includes('سرمایه گذاری') || lowerInput.includes('سود')) {
      return `سرمایه‌گذاری تو بازار مسکن همچنان یکی از امن‌ترین روش‌های حفظ ارزش پول تو ایرانه. تو شرایط کنونی، مناطق در حال توسعه تهران مثل منطقه 22، پردیس و برخی محله‌های منطقه 4 پتانسیل رشد بیشتری دارن. همچنین، خرید ملک کلنگی یا بازسازی آپارتمان‌های قدیمی تو مناطق با تقاضای بالا می‌تونه سودآور باشه. اما باید توجه داشته باشی که سرمایه‌گذاری تو ملک، یک استراتژی میان‌مدت تا بلندمدته. سرمایه‌ت در چه حدوده ${userName}؟`;
    }
    
    // پاسخ پیش‌فرض برای سایر موارد
    return `${userName} عزیز، به عنوان دستیار مشاوره املاک، می‌تونم تو زمینه خرید، فروش، اجاره و اطلاعات بازار مسکن کمکت کنم. لطفاً سوالت رو دقیق‌تر مطرح کن تا بتونم راهنمایی بهتری ارائه بدم. 😊`;
  }
}

// صدور یک نمونه پیش‌فرض از سرویس
export const apiService = new ApiService();
export default apiService; 