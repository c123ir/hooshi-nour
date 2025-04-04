import config from '../config.json';

// تعریف نوع داده‌ها
export interface DbMessage {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface DbConversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

// تعریف نوع داده برای ثبت استفاده از API
export interface ApiUsageRecord {
  id: number;
  timestamp: string;
  endpoint: string; // نوع سرویس (chat, audio, tts, etc.)
  request_type: string; // نوع درخواست (text, voice)
  response_type: string; // نوع پاسخ (text, voice)
  conversation_id?: number; // شناسه گفتگو (اختیاری)
  prompt_tokens: number; // تعداد توکن‌های ورودی
  completion_tokens: number; // تعداد توکن‌های خروجی
  total_tokens: number; // کل توکن‌های مصرف شده
  request_chars?: number; // تعداد کاراکترهای ورودی (برای صدا)
  response_chars?: number; // تعداد کاراکترهای خروجی (برای صدا)
  duration_seconds?: number; // مدت زمان صدا (به ثانیه)
  model: string; // مدل مورد استفاده
  error?: string; // خطای احتمالی
  cost: number; // هزینه تخمینی (به دلار)
  notes?: string; // یادداشت‌های اضافی
}

// تعریف نوع داده برای خلاصه مصرف API
export interface ApiUsageSummary {
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  prompt_tokens: number;
  completion_tokens: number;
  audio_seconds: number;
  tts_chars: number;
  by_model: {
    [key: string]: {
      requests: number;
      tokens: number;
      cost: number;
    }
  };
  by_date: {
    [key: string]: {
      requests: number;
      tokens: number;
      cost: number;
    }
  };
}

/**
 * سرویس مدیریت پایگاه داده با استفاده از IndexedDB برای ذخیره‌سازی دائمی داده‌ها در مرورگر
 */
export class DbService {
  private db: IDBDatabase | null = null;
  private initialized: boolean = false;
  private dbName: string = 'hooshiDatabase';
  private dbVersion: number = 3; // افزایش ورژن برای بروزرسانی ساختار دیتابیس و اضافه شدن جدول settings
  
  // برای ذخیره‌سازی موقت داده‌ها در حافظه
  private mockDatabase = {
    conversations: [] as any[],
    messages: [] as any[],
    apiUsage: [] as ApiUsageRecord[],
    conversationIdCounter: 1,
    messageIdCounter: 1,
    apiUsageIdCounter: 1
  };

  constructor() {
    console.log('در حال راه‌اندازی سرویس دیتابیس...');
    this.initDatabase();
    
    // ذخیره داده‌ها در localStorage هنگام بستن صفحه (پشتیبان)
    window.addEventListener('beforeunload', () => {
      this.saveToLocalStorage();
    });
  }

  /**
   * راه‌اندازی دیتابیس IndexedDB
   */
  private async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // بررسی پشتیبانی از IndexedDB
        if (!window.indexedDB) {
          console.warn('مرورگر شما از IndexedDB پشتیبانی نمی‌کند. استفاده از localStorage به عنوان جایگزین.');
          this.loadFromLocalStorage();
          this.initialized = true;
          resolve();
          return;
        }
        
        console.log('در حال اتصال به IndexedDB...');
        
        // درخواست باز کردن دیتابیس
        const request = window.indexedDB.open(this.dbName, this.dbVersion);
        
        // ایجاد جداول مورد نیاز هنگام ارتقای دیتابیس
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // ایجاد جدول گفتگوها
          if (!db.objectStoreNames.contains('conversations')) {
            const conversationsStore = db.createObjectStore('conversations', { keyPath: 'id' });
            conversationsStore.createIndex('updated_at', 'updated_at', { unique: false });
          }
          
          // ایجاد جدول پیام‌ها
          if (!db.objectStoreNames.contains('messages')) {
            const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
            messagesStore.createIndex('conversation_id', 'conversation_id', { unique: false });
          }
          
          // ایجاد جدول مصرف API
          if (!db.objectStoreNames.contains('api_usage')) {
            const apiUsageStore = db.createObjectStore('api_usage', { keyPath: 'id' });
            apiUsageStore.createIndex('timestamp', 'timestamp', { unique: false });
            apiUsageStore.createIndex('type', 'type', { unique: false });
          }
          
          // ایجاد جدول شمارنده‌ها
          if (!db.objectStoreNames.contains('counters')) {
            db.createObjectStore('counters', { keyPath: 'id' });
          }
          
          // ایجاد جدول تنظیمات
          if (!db.objectStoreNames.contains('settings')) {
            const settingsStore = db.createObjectStore('settings', { keyPath: 'id' });
            settingsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
        };
        
        // عملیات موفقیت‌آمیز
        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          console.log('اتصال به IndexedDB با موفقیت برقرار شد.');
          
          // بارگیری شمارنده‌ها
          this.loadCounters().then(() => {
            this.initialized = true;
            resolve();
          });
        };
        
        // خطا در اتصال
        request.onerror = (event) => {
          console.error('خطا در اتصال به IndexedDB:', (event.target as IDBOpenDBRequest).error);
          this.loadFromLocalStorage();
          this.initialized = true;
          resolve();
        };
      } catch (error) {
        console.error('خطا در راه‌اندازی دیتابیس:', error);
        this.loadFromLocalStorage();
        this.initialized = true;
        resolve();
      }
    });
  }

  /**
   * انتظار برای اتمام راه‌اندازی دیتابیس
   */
  private async waitForInitialization(): Promise<void> {
    if (this.initialized) return;
    
    let attempts = 0;
    const maxAttempts = 5;
    const delayMs = 1000;
    
    while (!this.initialized && attempts < maxAttempts) {
      console.log(`در انتظار راه‌اندازی دیتابیس... (تلاش ${attempts + 1} از ${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      attempts++;
    }
    
    if (!this.initialized) {
      console.error('دیتابیس پس از چندین تلاش راه‌اندازی نشد. استفاده از حالت موقت.');
      this.initialized = true;
    }
  }

  /**
   * بارگیری شمارنده‌ها از دیتابیس
   */
  private async loadCounters(): Promise<void> {
    try {
      if (!this.db) return;
      
      const transaction = this.db.transaction(['counters'], 'readonly');
      const store = transaction.objectStore('counters');
      
      // بارگیری شمارنده مکالمات
      const conversationCounterRequest = store.get('conversation_counter');
      conversationCounterRequest.onsuccess = () => {
        if (conversationCounterRequest.result) {
          this.mockDatabase.conversationIdCounter = conversationCounterRequest.result.value;
        }
      };
      
      // بارگیری شمارنده پیام‌ها
      const messageCounterRequest = store.get('message_counter');
      messageCounterRequest.onsuccess = () => {
        if (messageCounterRequest.result) {
          this.mockDatabase.messageIdCounter = messageCounterRequest.result.value;
        }
      };
      
      // بارگیری شمارنده ثبت مصرف API
      const apiUsageCounterRequest = store.get('api_usage_counter');
      apiUsageCounterRequest.onsuccess = () => {
        if (apiUsageCounterRequest.result) {
          this.mockDatabase.apiUsageIdCounter = apiUsageCounterRequest.result.value;
        }
      };
      
      return new Promise((resolve) => {
        transaction.oncomplete = () => {
          console.log('شمارنده‌ها با موفقیت بارگیری شدند:', {
            conversation: this.mockDatabase.conversationIdCounter,
            message: this.mockDatabase.messageIdCounter,
            apiUsage: this.mockDatabase.apiUsageIdCounter
          });
          resolve();
        };
        
        transaction.onerror = (event) => {
          console.error('خطا در بارگیری شمارنده‌ها:', event);
          resolve();
        };
      });
    } catch (error) {
      console.error('خطا در بارگیری شمارنده‌ها:', error);
    }
  }

  /**
   * ذخیره شمارنده‌ها در دیتابیس
   */
  private async saveCounters(): Promise<void> {
    try {
      if (!this.db) return;
      
      const transaction = this.db.transaction(['counters'], 'readwrite');
      const store = transaction.objectStore('counters');
      
      // ذخیره شمارنده مکالمات
      store.put({
        id: 'conversation_counter',
        value: this.mockDatabase.conversationIdCounter
      });
      
      // ذخیره شمارنده پیام‌ها
      store.put({
        id: 'message_counter',
        value: this.mockDatabase.messageIdCounter
      });
      
      // ذخیره شمارنده ثبت مصرف API
      store.put({
        id: 'api_usage_counter',
        value: this.mockDatabase.apiUsageIdCounter
      });
      
      return new Promise((resolve) => {
        transaction.oncomplete = () => {
          resolve();
        };
        
        transaction.onerror = (event) => {
          console.error('خطا در ذخیره شمارنده‌ها:', event);
          resolve();
        };
      });
    } catch (error) {
      console.error('خطا در ذخیره شمارنده‌ها:', error);
    }
  }

  /**
   * ذخیره یک گفتگوی جدید
   * @param title عنوان گفتگو
   */
  async createConversation(title: string): Promise<number> {
    await this.waitForInitialization();
    
    try {
      const id = this.mockDatabase.conversationIdCounter++;
      const timestamp = new Date().toISOString();
      
      const conversation = {
        id,
        title,
        created_at: timestamp,
        updated_at: timestamp
      };
      
      if (this.db) {
        // ذخیره در IndexedDB
        const transaction = this.db.transaction(['conversations'], 'readwrite');
        const store = transaction.objectStore('conversations');
        
        return new Promise((resolve, reject) => {
          const request = store.add(conversation);
          
          request.onsuccess = () => {
            // به‌روزرسانی شمارنده‌ها
            this.saveCounters();
            console.log('گفتگو با موفقیت در IndexedDB ذخیره شد:', id);
            resolve(id);
          };
          
          request.onerror = (event) => {
            console.error('خطا در ذخیره گفتگو در IndexedDB:', event);
            // ذخیره در حافظه به عنوان پشتیبان
            this.mockDatabase.conversations.push(conversation);
            this.saveToLocalStorage();
            resolve(id);
          };
        });
      } else {
        // ذخیره در حافظه
        this.mockDatabase.conversations.push(conversation);
        this.saveToLocalStorage();
        return id;
      }
    } catch (error) {
      console.error('خطا در ایجاد گفتگو:', error);
      
      // ایجاد در حافظه به عنوان پشتیبان
      const id = this.mockDatabase.conversationIdCounter++;
      const conversation = {
        id,
        title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      this.mockDatabase.conversations.push(conversation);
      this.saveToLocalStorage();
      
      return id;
    }
  }

  /**
   * ذخیره یک پیام در گفتگو
   * @param conversationId شناسه گفتگو
   * @param role نقش فرستنده (کاربر یا دستیار)
   * @param content محتوای پیام
   */
  async saveMessage(conversationId: number, role: 'user' | 'assistant', content: string): Promise<number> {
    await this.waitForInitialization();
    
    try {
      const id = this.mockDatabase.messageIdCounter++;
      const timestamp = new Date().toISOString();
      
      const message = {
        id,
        conversation_id: conversationId,
        role,
        content,
        created_at: timestamp
      };
      
      if (this.db) {
        // ذخیره پیام در IndexedDB
        const transaction = this.db.transaction(['messages', 'conversations'], 'readwrite');
        const messagesStore = transaction.objectStore('messages');
        const conversationsStore = transaction.objectStore('conversations');
        
        // به‌روزرسانی زمان آخرین تغییر گفتگو
        const conversationRequest = conversationsStore.get(conversationId);
        
        conversationRequest.onsuccess = () => {
          const conversation = conversationRequest.result;
          if (conversation) {
            conversation.updated_at = timestamp;
            conversationsStore.put(conversation);
          }
        };
        
        return new Promise((resolve, reject) => {
          const request = messagesStore.add(message);
          
          request.onsuccess = () => {
            // به‌روزرسانی شمارنده‌ها
            this.saveCounters();
            console.log('پیام با موفقیت در IndexedDB ذخیره شد:', id);
            resolve(id);
          };
          
          request.onerror = (event) => {
            console.error('خطا در ذخیره پیام در IndexedDB:', event);
            // ذخیره در حافظه به عنوان پشتیبان
            this.mockDatabase.messages.push(message);
            
            // به‌روزرسانی زمان آخرین تغییر گفتگو در حافظه
            const conversation = this.mockDatabase.conversations.find(c => c.id === conversationId);
            if (conversation) {
              conversation.updated_at = timestamp;
            }
            
            this.saveToLocalStorage();
            resolve(id);
          };
        });
      } else {
        // ذخیره در حافظه
        this.mockDatabase.messages.push(message);
        
        // به‌روزرسانی زمان آخرین تغییر گفتگو
        const conversation = this.mockDatabase.conversations.find(c => c.id === conversationId);
        if (conversation) {
          conversation.updated_at = timestamp;
        }
        
        this.saveToLocalStorage();
        return id;
      }
    } catch (error) {
      console.error('خطا در ذخیره پیام:', error);
      
      // ذخیره در حافظه به عنوان پشتیبان
      const id = this.mockDatabase.messageIdCounter++;
      const message = {
        id,
        conversation_id: conversationId,
        role,
        content,
        created_at: new Date().toISOString()
      };
      
      this.mockDatabase.messages.push(message);
      
      // به‌روزرسانی زمان آخرین تغییر گفتگو
      const conversation = this.mockDatabase.conversations.find(c => c.id === conversationId);
      if (conversation) {
        conversation.updated_at = new Date().toISOString();
      }
      
      this.saveToLocalStorage();
      return id;
    }
  }

  /**
   * دریافت فهرست همه گفتگوها
   */
  async getConversations() {
    await this.waitForInitialization();
    
    try {
      if (this.db) {
        // دریافت از IndexedDB
        const transaction = this.db.transaction(['conversations'], 'readonly');
        const store = transaction.objectStore('conversations');
        const index = store.index('updated_at');
        
        return new Promise((resolve, reject) => {
          const request = index.openCursor(null, 'prev'); // مرتب‌سازی نزولی بر اساس زمان به‌روزرسانی
          const conversations: any[] = [];
          
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            
            if (cursor) {
              conversations.push({
                id: cursor.value.id,
                title: cursor.value.title,
                updated_at: cursor.value.updated_at
              });
              cursor.continue();
            } else {
              console.log('گفتگوها با موفقیت از IndexedDB بازیابی شدند:', conversations.length);
              resolve(conversations);
            }
          };
          
          request.onerror = (event) => {
            console.error('خطا در بازیابی گفتگوها از IndexedDB:', event);
            // استفاده از داده‌های حافظه به عنوان پشتیبان
            resolve(this.getConversationsFromMemory());
          };
        });
      } else {
        // استفاده از داده‌های حافظه
        return this.getConversationsFromMemory();
      }
    } catch (error) {
      console.error('خطا در دریافت گفتگوها:', error);
      // استفاده از داده‌های حافظه به عنوان پشتیبان
      return this.getConversationsFromMemory();
    }
  }

  /**
   * دریافت گفتگوها از حافظه
   */
  private getConversationsFromMemory() {
    return this.mockDatabase.conversations
      .map(c => ({
        id: c.id,
        title: c.title,
        updated_at: c.updated_at
      }))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  /**
   * دریافت یک گفتگو با شناسه
   * @param conversationId شناسه گفتگو
   */
  async getConversationById(conversationId: number) {
    await this.waitForInitialization();
    
    try {
      if (this.db) {
        // دریافت از IndexedDB
        const transaction = this.db.transaction(['conversations', 'messages'], 'readonly');
        const conversationsStore = transaction.objectStore('conversations');
        const messagesStore = transaction.objectStore('messages');
        const messagesIndex = messagesStore.index('conversation_id');
        
        return new Promise((resolve, reject) => {
          // دریافت اطلاعات گفتگو
          const conversationRequest = conversationsStore.get(conversationId);
          
          conversationRequest.onsuccess = () => {
            const conversation = conversationRequest.result;
            
            if (!conversation) {
              console.log('گفتگو یافت نشد:', conversationId);
              resolve(null);
              return;
            }
            
            // دریافت پیام‌های گفتگو
            const messagesRequest = messagesIndex.getAll(conversationId);
            
            messagesRequest.onsuccess = () => {
              const messages = messagesRequest.result.sort((a: any, b: any) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              
              console.log('گفتگو با موفقیت از IndexedDB بازیابی شد:', conversation.title);
              resolve({
                ...conversation,
                messages
              });
            };
            
            messagesRequest.onerror = (event) => {
              console.error('خطا در بازیابی پیام‌ها از IndexedDB:', event);
              // استفاده از داده‌های حافظه به عنوان پشتیبان
              resolve(this.getConversationByIdFromMemory(conversationId));
            };
          };
          
          conversationRequest.onerror = (event) => {
            console.error('خطا در بازیابی گفتگو از IndexedDB:', event);
            // استفاده از داده‌های حافظه به عنوان پشتیبان
            resolve(this.getConversationByIdFromMemory(conversationId));
          };
        });
      } else {
        // استفاده از داده‌های حافظه
        return this.getConversationByIdFromMemory(conversationId);
      }
    } catch (error) {
      console.error('خطا در دریافت گفتگو:', error);
      // استفاده از داده‌های حافظه به عنوان پشتیبان
      return this.getConversationByIdFromMemory(conversationId);
    }
  }

  /**
   * دریافت گفتگو از حافظه
   */
  private getConversationByIdFromMemory(conversationId: number) {
    const conversation = this.mockDatabase.conversations.find(c => c.id === conversationId);
    
    if (!conversation) {
      return null;
    }
    
    const messages = this.mockDatabase.messages
      .filter(m => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    return {
      ...conversation,
      messages
    };
  }

  /**
   * حذف یک گفتگو
   * @param conversationId شناسه گفتگو
   */
  async deleteConversation(conversationId: number): Promise<boolean> {
    await this.waitForInitialization();
    
    try {
      if (this.db) {
        // حذف از IndexedDB
        const transaction = this.db.transaction(['conversations', 'messages'], 'readwrite');
        const conversationsStore = transaction.objectStore('conversations');
        const messagesStore = transaction.objectStore('messages');
        const messagesIndex = messagesStore.index('conversation_id');
        
        return new Promise((resolve, reject) => {
          // حذف پیام‌های گفتگو
          const messagesRequest = messagesIndex.openCursor(IDBKeyRange.only(conversationId));
          
          messagesRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            
            if (cursor) {
              messagesStore.delete(cursor.primaryKey);
              cursor.continue();
            }
          };
          
          // حذف گفتگو
          const conversationRequest = conversationsStore.delete(conversationId);
          
          transaction.oncomplete = () => {
            console.log('گفتگو با موفقیت از IndexedDB حذف شد:', conversationId);
            
            // حذف از حافظه نیز
            this.deleteConversationFromMemory(conversationId);
            
            resolve(true);
          };
          
          transaction.onerror = (event) => {
            console.error('خطا در حذف گفتگو از IndexedDB:', event);
            // استفاده از داده‌های حافظه به عنوان پشتیبان
            resolve(this.deleteConversationFromMemory(conversationId));
          };
        });
      } else {
        // استفاده از داده‌های حافظه
        return this.deleteConversationFromMemory(conversationId);
      }
    } catch (error) {
      console.error('خطا در حذف گفتگو:', error);
      // استفاده از داده‌های حافظه به عنوان پشتیبان
      return this.deleteConversationFromMemory(conversationId);
    }
  }

  /**
   * حذف گفتگو از حافظه
   */
  private deleteConversationFromMemory(conversationId: number): boolean {
    this.mockDatabase.messages = this.mockDatabase.messages.filter(m => m.conversation_id !== conversationId);
    
    const beforeLength = this.mockDatabase.conversations.length;
    this.mockDatabase.conversations = this.mockDatabase.conversations.filter(c => c.id !== conversationId);
    
    this.saveToLocalStorage();
    return beforeLength > this.mockDatabase.conversations.length;
  }

  /**
   * به‌روزرسانی عنوان یک گفتگو
   * @param conversationId شناسه گفتگو
   * @param newTitle عنوان جدید
   */
  async updateConversationTitle(conversationId: number, newTitle: string): Promise<boolean> {
    await this.waitForInitialization();
    
    try {
      if (this.db) {
        // به‌روزرسانی در IndexedDB
        const transaction = this.db.transaction(['conversations'], 'readwrite');
        const store = transaction.objectStore('conversations');
        
        return new Promise((resolve, reject) => {
          const request = store.get(conversationId);
          
          request.onsuccess = () => {
            const conversation = request.result;
            
            if (!conversation) {
              console.error('گفتگو برای به‌روزرسانی عنوان یافت نشد:', conversationId);
              resolve(false);
              return;
            }
            
            conversation.title = newTitle;
            conversation.updated_at = new Date().toISOString();
            
            const updateRequest = store.put(conversation);
            
            updateRequest.onsuccess = () => {
              console.log('عنوان گفتگو با موفقیت به‌روزرسانی شد:', conversationId);
              resolve(true);
            };
            
            updateRequest.onerror = (event) => {
              console.error('خطا در به‌روزرسانی عنوان گفتگو در IndexedDB:', event);
              // به‌روزرسانی در حافظه به عنوان پشتیبان
              resolve(this.updateConversationTitleInMemory(conversationId, newTitle));
            };
          };
          
          request.onerror = (event) => {
            console.error('خطا در یافتن گفتگو برای به‌روزرسانی عنوان:', event);
            // به‌روزرسانی در حافظه به عنوان پشتیبان
            resolve(this.updateConversationTitleInMemory(conversationId, newTitle));
          };
        });
      } else {
        // به‌روزرسانی در حافظه
        return this.updateConversationTitleInMemory(conversationId, newTitle);
      }
    } catch (error) {
      console.error('خطا در به‌روزرسانی عنوان گفتگو:', error);
      // به‌روزرسانی در حافظه به عنوان پشتیبان
      return this.updateConversationTitleInMemory(conversationId, newTitle);
    }
  }

  /**
   * به‌روزرسانی عنوان یک گفتگو در حافظه
   */
  private updateConversationTitleInMemory(conversationId: number, newTitle: string): boolean {
    const conversation = this.mockDatabase.conversations.find(c => c.id === conversationId);
    
    if (!conversation) {
      return false;
    }
    
    conversation.title = newTitle;
    conversation.updated_at = new Date().toISOString();
    
    this.saveToLocalStorage();
    return true;
  }

  /**
   * ریست کردن پایگاه داده
   */
  async resetDatabase(): Promise<boolean> {
    await this.waitForInitialization();
    
    try {
      if (this.db) {
        // حذف تمام داده‌ها از IndexedDB
        const transaction = this.db.transaction(['conversations', 'messages'], 'readwrite');
        const conversationsStore = transaction.objectStore('conversations');
        const messagesStore = transaction.objectStore('messages');
        
        return new Promise((resolve, reject) => {
          // حذف تمام گفتگوها
          const clearConversationsRequest = conversationsStore.clear();
          
          // حذف تمام پیام‌ها
          const clearMessagesRequest = messagesStore.clear();
          
          transaction.oncomplete = () => {
            console.log('دیتابیس با موفقیت ریست شد.');
            
            // ریست شمارنده‌ها
            this.mockDatabase.conversationIdCounter = 1;
            this.mockDatabase.messageIdCounter = 1;
            this.saveCounters();
            
            // ریست حافظه نیز
            this.resetMemory();
            
            resolve(true);
          };
          
          transaction.onerror = (event) => {
            console.error('خطا در ریست دیتابیس:', event);
            // استفاده از داده‌های حافظه به عنوان پشتیبان
            resolve(this.resetMemory());
          };
        });
      } else {
        // استفاده از داده‌های حافظه
        return this.resetMemory();
      }
    } catch (error) {
      console.error('خطا در ریست دیتابیس:', error);
      // استفاده از داده‌های حافظه به عنوان پشتیبان
      return this.resetMemory();
    }
  }

  /**
   * ریست حافظه
   */
  private resetMemory(): boolean {
    this.mockDatabase.conversations = [];
    this.mockDatabase.messages = [];
    this.mockDatabase.conversationIdCounter = 1;
    this.mockDatabase.messageIdCounter = 1;
    
    this.saveToLocalStorage();
    return true;
  }

  /**
   * ذخیره داده‌ها در localStorage (برای پشتیبان یا در صورت عدم وجود IndexedDB)
   */
  private saveToLocalStorage() {
    try {
      localStorage.setItem('hooshi_conversations', JSON.stringify(this.mockDatabase.conversations));
      localStorage.setItem('hooshi_messages', JSON.stringify(this.mockDatabase.messages));
      localStorage.setItem('hooshi_api_usage', JSON.stringify(this.mockDatabase.apiUsage));
      localStorage.setItem('hooshi_counters', JSON.stringify({
        conversation: this.mockDatabase.conversationIdCounter,
        message: this.mockDatabase.messageIdCounter,
        apiUsage: this.mockDatabase.apiUsageIdCounter
      }));
    } catch (error) {
      console.error('خطا در ذخیره داده‌ها در localStorage:', error);
    }
  }
  
  /**
   * بارگیری داده‌ها از localStorage
   */
  private loadFromLocalStorage() {
    try {
      const conversations = localStorage.getItem('hooshi_conversations');
      if (conversations) {
        this.mockDatabase.conversations = JSON.parse(conversations);
      }
      
      const messages = localStorage.getItem('hooshi_messages');
      if (messages) {
        this.mockDatabase.messages = JSON.parse(messages);
      }
      
      const apiUsage = localStorage.getItem('hooshi_api_usage');
      if (apiUsage) {
        this.mockDatabase.apiUsage = JSON.parse(apiUsage);
      }
      
      const counters = localStorage.getItem('hooshi_counters');
      if (counters) {
        const parsedCounters = JSON.parse(counters);
        this.mockDatabase.conversationIdCounter = parsedCounters.conversation || 1;
        this.mockDatabase.messageIdCounter = parsedCounters.message || 1;
        this.mockDatabase.apiUsageIdCounter = parsedCounters.apiUsage || 1;
      }
    } catch (error) {
      console.error('خطا در بارگیری داده‌ها از localStorage:', error);
    }
  }

  /**
   * ثبت استفاده از API
   * @param usageData اطلاعات استفاده از API
   */
  async recordApiUsage(usageData: Omit<ApiUsageRecord, 'id' | 'timestamp'>): Promise<number> {
    await this.waitForInitialization();
    
    try {
      const id = this.mockDatabase.apiUsageIdCounter++;
      const timestamp = new Date().toISOString();
      
      const apiUsageRecord: ApiUsageRecord = {
        id,
        timestamp,
        ...usageData
      };
      
      // افزودن به حافظه موقت
      this.mockDatabase.apiUsage.push(apiUsageRecord);
      
      if (this.db) {
        // ذخیره در IndexedDB
        const transaction = this.db.transaction(['api_usage'], 'readwrite');
        const store = transaction.objectStore('api_usage');
        
        return new Promise((resolve, reject) => {
          const request = store.add(apiUsageRecord);
          
          request.onsuccess = () => {
            // به‌روزرسانی شمارنده‌ها
            this.saveCounters();
            console.log('ثبت مصرف API با موفقیت انجام شد:', apiUsageRecord);
            resolve(id);
          };
          
          request.onerror = (event) => {
            console.error('خطا در ثبت مصرف API:', event);
            reject(new Error('خطا در ثبت مصرف API'));
          };
        });
      } else {
        // استفاده از حافظه موقت
        console.log('ثبت مصرف API در حافظه موقت:', apiUsageRecord);
        this.saveToLocalStorage();
        return Promise.resolve(id);
      }
    } catch (error) {
      console.error('خطا در ثبت مصرف API:', error);
      return Promise.reject(error);
    }
  }

  /**
   * دریافت سابقه استفاده از API
   * @param limit تعداد رکوردهای درخواستی
   * @param offset تعداد رکوردهای رد شده
   */
  async getApiUsageHistory(limit = 100, offset = 0): Promise<ApiUsageRecord[]> {
    await this.waitForInitialization();
    
    try {
      if (this.db) {
        const transaction = this.db.transaction(['api_usage'], 'readonly');
        const store = transaction.objectStore('api_usage');
        const index = store.index('timestamp');
        
        return new Promise((resolve, reject) => {
          const records: ApiUsageRecord[] = [];
          let cursorRequest: IDBRequest<IDBCursorWithValue | null>;
          
          try {
            // استفاده از منطق کرسور برای پیمایش سریع‌تر
            cursorRequest = index.openCursor(null, 'prev'); // به ترتیب نزولی (جدیدترین ابتدا)
            let skipCount = 0;
            let collectCount = 0;
            
            cursorRequest.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
              
              if (cursor) {
                if (skipCount < offset) {
                  skipCount++;
                  cursor.continue();
                } else if (collectCount < limit) {
                  records.push(cursor.value);
                  collectCount++;
                  cursor.continue();
                }
              } else {
                resolve(records);
              }
            };
            
            cursorRequest.onerror = (event) => {
              console.error('خطا در دریافت سابقه مصرف API:', event);
              reject(new Error('خطا در دریافت سابقه مصرف API'));
            };
          } catch (error) {
            console.error('خطا در ایجاد کرسور:', error);
            // روش جایگزین: دریافت تمام رکوردها
            const getAllRequest = index.getAll();
            
            getAllRequest.onsuccess = () => {
              const allRecords = getAllRequest.result;
              // مرتب‌سازی به ترتیب نزولی (جدیدترین ابتدا)
              allRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
              // اعمال محدودیت‌های offset و limit
              resolve(allRecords.slice(offset, offset + limit));
            };
            
            getAllRequest.onerror = (event) => {
              console.error('خطا در دریافت سابقه مصرف API:', event);
              reject(new Error('خطا در دریافت سابقه مصرف API'));
            };
          }
        });
      } else {
        // استفاده از حافظه موقت
        const records = [...this.mockDatabase.apiUsage];
        records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return Promise.resolve(records.slice(offset, offset + limit));
      }
    } catch (error) {
      console.error('خطا در دریافت سابقه مصرف API:', error);
      return Promise.reject(error);
    }
  }

  /**
   * محاسبه خلاصه استفاده از API
   * @param startDate تاریخ شروع (اختیاری)
   * @param endDate تاریخ پایان (اختیاری)
   */
  async getApiUsageSummary(startDate?: Date, endDate?: Date): Promise<ApiUsageSummary> {
    await this.waitForInitialization();
    
    // تنظیم تاریخ‌های پیش‌فرض (30 روز گذشته تا امروز)
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // تبدیل تاریخ‌ها به رشته ISO برای مقایسه
    const startISO = start.toISOString();
    const endISO = end.toISOString();
    
    try {
      // دریافت تمام رکوردها در بازه زمانی
      let records: ApiUsageRecord[];
      
      if (this.db) {
        const transaction = this.db.transaction(['api_usage'], 'readonly');
        const store = transaction.objectStore('api_usage');
        const index = store.index('timestamp');
        
        // استفاده از IDBKeyRange برای محدود کردن بازه
        const range = IDBKeyRange.bound(startISO, endISO);
        
        records = await new Promise((resolve, reject) => {
          const request = index.getAll(range);
          
          request.onsuccess = () => {
            resolve(request.result);
          };
          
          request.onerror = (event) => {
            console.error('خطا در دریافت سابقه مصرف API:', event);
            reject(new Error('خطا در دریافت سابقه مصرف API'));
          };
        });
      } else {
        // فیلتر کردن رکوردها از حافظه موقت
        records = this.mockDatabase.apiUsage.filter(record => {
          const recordDate = record.timestamp;
          return recordDate >= startISO && recordDate <= endISO;
        });
      }
      
      // ایجاد خلاصه آماری
      const summary: ApiUsageSummary = {
        total_requests: 0,
        total_tokens: 0,
        total_cost: 0,
        prompt_tokens: 0,
        completion_tokens: 0,
        audio_seconds: 0,
        tts_chars: 0,
        by_model: {},
        by_date: {}
      };
      
      // پردازش رکوردها
      records.forEach(record => {
        summary.total_requests++;
        summary.total_tokens += record.total_tokens || 0;
        summary.total_cost += record.cost || 0;
        summary.prompt_tokens += record.prompt_tokens || 0;
        summary.completion_tokens += record.completion_tokens || 0;
        summary.audio_seconds += record.duration_seconds || 0;
        summary.tts_chars += (record.endpoint === 'tts' ? record.request_chars || 0 : 0);
        
        // گروه‌بندی بر اساس مدل
        const model = record.model || 'unknown';
        if (!summary.by_model[model]) {
          summary.by_model[model] = { requests: 0, tokens: 0, cost: 0 };
        }
        summary.by_model[model].requests++;
        summary.by_model[model].tokens += record.total_tokens || 0;
        summary.by_model[model].cost += record.cost || 0;
        
        // گروه‌بندی بر اساس تاریخ
        const date = record.timestamp.split('T')[0]; // استخراج تاریخ از ISO string
        if (!summary.by_date[date]) {
          summary.by_date[date] = { requests: 0, tokens: 0, cost: 0 };
        }
        summary.by_date[date].requests++;
        summary.by_date[date].tokens += record.total_tokens || 0;
        summary.by_date[date].cost += record.cost || 0;
      });
      
      return summary;
    } catch (error) {
      console.error('خطا در محاسبه خلاصه مصرف API:', error);
      return Promise.reject(error);
    }
  }

  /**
   * پاکسازی سابقه استفاده از API
   * @param days پاک کردن سوابق قدیمی‌تر از چند روز (پیش‌فرض: حفظ 60 روز)
   */
  async cleanupOldApiUsageRecords(days = 60): Promise<number> {
    await this.waitForInitialization();
    
    // محاسبه تاریخ قطع
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffISO = cutoffDate.toISOString();
    
    try {
      let deletedCount = 0;
      
      if (this.db) {
        const transaction = this.db.transaction(['api_usage'], 'readwrite');
        const store = transaction.objectStore('api_usage');
        const index = store.index('timestamp');
        
        // استفاده از IDBKeyRange برای محدود کردن بازه
        const range = IDBKeyRange.upperBound(cutoffISO);
        
        // گرفتن شناسه‌های رکوردهای قدیمی
        const recordsToDelete = await new Promise<number[]>((resolve, reject) => {
          const ids: number[] = [];
          const cursorRequest = index.openCursor(range);
          
          cursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
            
            if (cursor) {
              ids.push(cursor.value.id);
              cursor.continue();
            } else {
              resolve(ids);
            }
          };
          
          cursorRequest.onerror = (event) => {
            console.error('خطا در پیمایش رکوردهای قدیمی API:', event);
            reject(new Error('خطا در پیمایش رکوردهای قدیمی API'));
          };
        });
        
        // حذف رکوردها
        await Promise.all(recordsToDelete.map(id => {
          return new Promise<void>((resolve, reject) => {
            const deleteRequest = store.delete(id);
            
            deleteRequest.onsuccess = () => {
              deletedCount++;
              resolve();
            };
            
            deleteRequest.onerror = (event) => {
              console.error(`خطا در حذف رکورد API با شناسه ${id}:`, event);
              resolve(); // ادامه روند حذف با وجود خطا
            };
          });
        }));
        
        // به‌روزرسانی حافظه موقت
        this.mockDatabase.apiUsage = this.mockDatabase.apiUsage.filter(record => 
          record.timestamp >= cutoffISO
        );
        
        // ذخیره تغییرات در localStorage
        this.saveToLocalStorage();
        
        console.log(`${deletedCount} رکورد قدیمی مصرف API پاکسازی شد.`);
        return deletedCount;
      } else {
        // پاکسازی از حافظه موقت
        const initialCount = this.mockDatabase.apiUsage.length;
        this.mockDatabase.apiUsage = this.mockDatabase.apiUsage.filter(record => 
          record.timestamp >= cutoffISO
        );
        deletedCount = initialCount - this.mockDatabase.apiUsage.length;
        
        // ذخیره تغییرات در localStorage
        this.saveToLocalStorage();
        
        console.log(`${deletedCount} رکورد قدیمی مصرف API پاکسازی شد.`);
        return deletedCount;
      }
    } catch (error) {
      console.error('خطا در پاکسازی رکوردهای قدیمی مصرف API:', error);
      return Promise.reject(error);
    }
  }

  /**
   * دریافت اشاره‌گر به دیتابیس
   * @returns اشاره‌گر به دیتابیس IndexedDB یا null
   */
  getDb(): IDBDatabase | null {
    return this.db;
  }

  /**
   * ذخیره تنظیمات در دیتابیس
   * @param settingsData آبجکت تنظیمات
   */
  async saveSettings(settingsData: any): Promise<boolean> {
    await this.waitForInitialization();
    
    try {
      if (this.db) {
        return new Promise((resolve) => {
          const transaction = this.db!.transaction(['settings'], 'readwrite');
          const store = transaction.objectStore('settings');
          
          // پاک کردن همه تنظیمات قبلی
          const clearRequest = store.clear();
          
          clearRequest.onsuccess = () => {
            // افزودن تنظیمات جدید
            const addRequest = store.add({
              id: 1, // همیشه از شناسه یکسان استفاده می‌کنیم
              data: settingsData,
              updatedAt: new Date().getTime()
            });
            
            addRequest.onsuccess = () => {
              console.log('تنظیمات با موفقیت در IndexedDB ذخیره شد');
              resolve(true);
            };
            
            addRequest.onerror = () => {
              console.error('خطا در ذخیره تنظیمات در IndexedDB:', addRequest.error);
              resolve(false);
            };
          };
          
          clearRequest.onerror = () => {
            console.error('خطا در پاک کردن تنظیمات قبلی از IndexedDB:', clearRequest.error);
            resolve(false);
          };
        });
      }
      
      // در صورت عدم وجود دیتابیس، فقط در localStorage ذخیره می‌کنیم
      return true;
    } catch (error) {
      console.error('خطا در ذخیره تنظیمات در دیتابیس:', error);
      return false;
    }
  }
  
  /**
   * بازیابی تنظیمات از دیتابیس
   * @returns آبجکت تنظیمات یا null در صورت خطا
   */
  async getSettings(): Promise<any | null> {
    await this.waitForInitialization();
    
    try {
      if (this.db) {
        return new Promise((resolve) => {
          const transaction = this.db!.transaction(['settings'], 'readonly');
          const store = transaction.objectStore('settings');
          const request = store.get(1); // شناسه ثابت تنظیمات
          
          request.onsuccess = () => {
            if (request.result) {
              console.log('تنظیمات با موفقیت از IndexedDB بازیابی شد');
              resolve(request.result.data);
            } else {
              console.log('تنظیماتی در IndexedDB یافت نشد');
              resolve(null);
            }
          };
          
          request.onerror = () => {
            console.error('خطا در بازیابی تنظیمات از IndexedDB:', request.error);
            resolve(null);
          };
        });
      }
      
      return null;
    } catch (error) {
      console.error('خطا در بازیابی تنظیمات از دیتابیس:', error);
      return null;
    }
  }
}

// ایجاد نمونه سرویس دیتابیس
const dbService = new DbService();

export default dbService; 