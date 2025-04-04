import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import ChatInterface from '../components/chat/ChatInterface';
import { Message, Conversation } from '../data/conversations';
import { apiService } from '../services/api';
import dbService from '../services/db';
import config from '../config.json';

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // بارگیری اولیه مکالمه
  useEffect(() => {
    const loadConversation = async () => {
      try {
        setDataLoading(true);
        
        // بارگذاری نام کاربر و دستیار از localStorage
        let userName = config.default_user_name || 'عزیز';
        let assistantName = config.default_assistant_name || 'هوشی';
        
        // بررسی تنظیمات در localStorage
        const storedSettings = localStorage.getItem('hooshi_settings');
        if (storedSettings) {
          try {
            const settings = JSON.parse(storedSettings);
            if (settings.userName) userName = settings.userName;
            if (settings.assistantName) assistantName = settings.assistantName;
            console.log('نام کاربر و دستیار از localStorage بارگذاری شد:', userName, assistantName);
          } catch (error) {
            console.error('خطا در بارگذاری نام کاربر و دستیار از localStorage:', error);
          }
        }
        
        if (id && id !== 'new') {
          console.log('در حال بارگیری مکالمه:', id);
          
          // تلاش برای بازیابی مکالمه از دیتابیس
          const conversationId = parseInt(id);
          if (isNaN(conversationId)) {
            navigate('/chat/new', { replace: true });
            return;
          }
          
          const conversation = await dbService.getConversationById(conversationId);
          
          if (conversation) {
            console.log('مکالمه یافت شد:', conversation.title);
            
            // تبدیل فرمت پیام‌ها به فرمت موردنیاز برنامه
            const loadedMessages: Message[] = conversation.messages.map((msg: any) => ({
              id: String(msg.id),
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: new Date(msg.created_at).toISOString()
            }));
            
            setMessages(loadedMessages);
            setCurrentConversation({
              id: String(conversation.id),
              title: conversation.title,
              messages: loadedMessages,
              lastUpdated: new Date(conversation.updated_at).toISOString()
            });
          } else {
            console.error('مکالمه یافت نشد');
            // ایجاد مکالمه جدید
            navigate('/chat/new', { replace: true });
          }
        } else {
          // مکالمه جدید
          console.log('ایجاد مکالمه جدید');
          
          // ایجاد پیام خوش‌آمدگویی با استفاده از نام کاربر و دستیار بارگذاری شده
          const initialMessage: Message = {
            id: uuidv4(),
            role: 'assistant',
            content: `سلام ${userName}! من ${assistantName} هستم، دستیار هوشمند مشاوره املاک. چطور می‌تونم کمکت کنم؟`,
            timestamp: new Date().toISOString(),
          };
          
          // تنظیم گفتگو
          const newConversation: Conversation = {
            id: uuidv4(),
            title: 'گفتگوی جدید',
            messages: [initialMessage],
            lastUpdated: new Date().toISOString()
          };
          
          setCurrentConversation(newConversation);
          setMessages([initialMessage]);
          
          // ذخیره مکالمه جدید در دیتابیس
          try {
            const newId = await dbService.createConversation('گفتگوی جدید');
            // ذخیره پیام اولیه در پایگاه داده
            await dbService.saveMessage(
              newId,
              initialMessage.role,
              initialMessage.content
            );
            
            // به‌روزرسانی URL بدون ایجاد پیمایش جدید
            navigate(`/chat/${newId}`, { replace: true });
          } catch (error) {
            console.error('خطا در ایجاد مکالمه جدید:', error);
          }
        }
      } catch (error) {
        console.error('خطا در بارگیری مکالمه:', error);
      } finally {
        setDataLoading(false);
      }
    };

    loadConversation();
  }, [id, navigate]);

  // ارسال پیام به هوش مصنوعی
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !currentConversation) return;
    
    const currentId = parseInt(currentConversation.id);
    const isValidId = !isNaN(currentId);
    
    try {
      // ایجاد پیام کاربر
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: new Date().toISOString()
      };
      
      // به‌روزرسانی لیست پیام‌ها
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setIsLoading(true);
      
      // به‌روزرسانی مکالمه در حافظه
      const updatedConversation = {
        ...currentConversation,
        messages: updatedMessages,
        lastUpdated: new Date().toISOString()
      };
      
      // ذخیره پیام کاربر در دیتابیس
      if (isValidId) {
        await dbService.saveMessage(currentId, userMessage.role, userMessage.content);
      }
      
      // ارسال پیام به API با ارسال شناسه گفتگو برای ثبت مصرف توکن
      const response = await apiService.sendMessage(content, messages, isValidId ? currentId : undefined);
      
      // ایجاد پیام هوش مصنوعی
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      };
      
      // به‌روزرسانی لیست پیام‌ها
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      
      // به‌روزرسانی مکالمه در حافظه
      const finalConversation = {
        ...updatedConversation,
        messages: finalMessages,
        lastUpdated: new Date().toISOString()
      };
      
      // تلاش برای به‌روزرسانی عنوان گفتگو با هر پیام جدید
      try {
        // تولید عنوان هوشمند برای گفتگو
        const suggestedTitle = await generateConversationTitle(content, response);
        finalConversation.title = suggestedTitle;
        
        // به‌روزرسانی عنوان در دیتابیس
        if (isValidId) {
          await dbService.updateConversationTitle(currentId, suggestedTitle);
        }
      } catch (titleError) {
        console.error('خطا در تولید عنوان گفتگو:', titleError);
      }
      
      setCurrentConversation(finalConversation);
      
      // ذخیره پیام هوش مصنوعی در دیتابیس
      if (isValidId) {
        await dbService.saveMessage(currentId, assistantMessage.role, assistantMessage.content);
      }
      
    } catch (error) {
      console.error('خطا در ارسال پیام:', error);
      
      // نمایش پیام خطا
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: 'متأسفانه در ارتباط با سرور مشکلی پیش آمده است. لطفاً دوباره تلاش کنید.',
        timestamp: new Date().toISOString()
      };
      
      setMessages([...messages, errorMessage]);
      
      // ذخیره پیام خطا در دیتابیس
      if (isValidId) {
        try {
          await dbService.saveMessage(currentId, errorMessage.role, errorMessage.content);
        } catch (dbError) {
          console.error('خطا در ذخیره پیام خطا:', dbError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ویرایش پیام
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!currentConversation) return;
    
    const currentId = parseInt(currentConversation.id);
    const isValidId = !isNaN(currentId);
    
    try {
      // یافتن پیام مورد نظر
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      
      if (messageIndex === -1) {
        console.error('پیام برای ویرایش یافت نشد');
        return;
      }
      
      // آیا پیام کاربر است؟
      const isUserMessage = messages[messageIndex].role === 'user';
      
      if (!isUserMessage) {
        console.error('فقط پیام‌های کاربر قابل ویرایش هستند');
        return;
      }
      
      // کپی از آرایه پیام‌ها
      const updatedMessages = [...messages];
      
      // به‌روزرسانی پیام
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        content: newContent,
        timestamp: new Date().toISOString() // زمان ویرایش
      };
      
      // حذف پیام‌های بعد از پیام ویرایش شده (چون پاسخ‌ها دیگر معتبر نیستند)
      const truncatedMessages = updatedMessages.slice(0, messageIndex + 1);
      
      // به‌روزرسانی حالت
      setMessages(truncatedMessages);
      setIsLoading(true);
      
      // به‌روزرسانی مکالمه در حافظه
      const updatedConversation = {
        ...currentConversation,
        messages: truncatedMessages,
        lastUpdated: new Date().toISOString()
      };
      
      setCurrentConversation(updatedConversation);
      
      // به‌روزرسانی پیام در دیتابیس
      if (isValidId) {
        // فعلاً راهی برای ویرایش مستقیم پیام نداریم - باید پیام‌های قبلی حفظ شوند
        // و یک پیام جدید اضافه کنیم
        await dbService.saveMessage(currentId, 'user', newContent);
      }
      
      // دریافت پاسخ جدید از API با ارسال شناسه گفتگو برای ثبت مصرف توکن
      const response = await apiService.sendMessage(newContent, truncatedMessages.slice(0, -1), isValidId ? currentId : undefined);
      
      // ایجاد پیام هوش مصنوعی
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      };
      
      // به‌روزرسانی لیست پیام‌ها
      const finalMessages = [...truncatedMessages, assistantMessage];
      setMessages(finalMessages);
      
      // به‌روزرسانی مکالمه در حافظه
      const finalConversation = {
        ...updatedConversation,
        messages: finalMessages,
        lastUpdated: new Date().toISOString()
      };
      
      setCurrentConversation(finalConversation);
      
      // ذخیره پاسخ جدید در دیتابیس
      if (isValidId) {
        await dbService.saveMessage(currentId, assistantMessage.role, assistantMessage.content);
      }
      
    } catch (error) {
      console.error('خطا در ویرایش پیام:', error);
      
      // نمایش پیام خطا
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: 'متأسفانه در ویرایش پیام مشکلی پیش آمده است. لطفاً دوباره تلاش کنید.',
        timestamp: new Date().toISOString()
      };
      
      setMessages([...messages, errorMessage]);
      
      // ذخیره پیام خطا در دیتابیس
      if (isValidId) {
        try {
          await dbService.saveMessage(currentId, errorMessage.role, errorMessage.content);
        } catch (dbError) {
          console.error('خطا در ذخیره پیام خطا:', dbError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // افزودن مدیریت خروج از صفحه 
  useEffect(() => {
    // تابع به‌روزرسانی نهایی گفتگو هنگام خروج
    const finalizeConversation = async () => {
      if (currentConversation && messages.length > 0) {
        console.log('در حال ذخیره نهایی وضعیت گفتگو...');
        
        const currentId = parseInt(currentConversation.id);
        if (!isNaN(currentId)) {
          try {
            // به‌روزرسانی نهایی عنوان با متن کامل
            if (messages.length >= 2) {
              // استخراج آخرین پیام کاربر و آخرین پاسخ هوش مصنوعی
              const userMessages = messages.filter(msg => msg.role === 'user');
              const assistantMessages = messages.filter(msg => msg.role === 'assistant');
              
              if (userMessages.length > 0 && assistantMessages.length > 0) {
                const lastUserMessage = userMessages[userMessages.length - 1].content;
                const lastAssistantMessage = assistantMessages[assistantMessages.length - 1].content;
                
                // تولید عنوان نهایی با تمام متن
                const finalTitle = await generateConversationTitle(lastUserMessage, lastAssistantMessage);
                
                // به‌روزرسانی در دیتابیس
                await dbService.updateConversationTitle(currentId, finalTitle);
                console.log('عنوان نهایی گفتگو به‌روزرسانی شد:', finalTitle);
              }
            }
          } catch (error) {
            console.error('خطا در به‌روزرسانی نهایی گفتگو:', error);
          }
        }
      }
    };

    // اجرای به‌روزرسانی هنگام خروج از صفحه
    window.addEventListener('beforeunload', finalizeConversation);
    
    // پاکسازی لیسنر هنگام حذف کامپوننت
    return () => {
      window.removeEventListener('beforeunload', finalizeConversation);
      finalizeConversation();
    };
  }, [currentConversation, messages]);

  // تابع برای تولید عنوان هوشمند گفتگو بر اساس متن پیام کاربر و پاسخ هوش مصنوعی
  const generateConversationTitle = async (userMessage: string, aiResponse: string): Promise<string> => {
    try {
      console.log('تلاش برای تولید عنوان با پیام:', userMessage);
      
      // بارگذاری نام کاربر از localStorage
      let userName = config.default_user_name || 'مجتبی';
      
      // بررسی تنظیمات در localStorage
      const storedSettings = localStorage.getItem('hooshi_settings');
      if (storedSettings) {
        try {
          const settings = JSON.parse(storedSettings);
          if (settings.userName) userName = settings.userName;
        } catch (error) {
          console.error('خطا در بارگذاری نام کاربر از localStorage:', error);
        }
      }
      
      // بررسی اینکه آیا پیام کاربر کوتاه و فقط احوالپرسی است یا خیر
      const greetingRegex = /^[\s\u0600-\u06FF]*(?:سلام|خوبی|چطوری|خوبین|چطورین|درود)[\s\u0600-\u06FF،,.?؟!]*$/i;
      
      // اگر پیام کاربر فقط سلام و احوالپرسی است، از عنوان پیش‌فرض استفاده کنیم
      if (greetingRegex.test(userMessage) || userMessage.length < 4) {
        console.log('پیام کاربر خیلی کوتاه یا احوالپرسی است، استفاده از عنوان پیش‌فرض');
        return `گفتگوی جدید ${userName} با هوشی`;
      }
      
      // ترکیب متن کاربر و پاسخ هوش مصنوعی برای یافتن بهترین عنوان
      const combinedText = userMessage + ' ' + aiResponse;
      
      // حذف کلمات احوالپرسی و سلام از ابتدای متن برای تحلیل بهتر
      const cleanedText = combinedText.replace(/^[\s\u0600-\u06FF]*(?:سلام|خوبی|چطوری|خوبین|چطورین|درود)[\s\u0600-\u06FF،,.?؟!]*/, '');
      console.log('متن تمیز شده برای تحلیل:', cleanedText.substring(0, 50) + '...');
      
      // پاک کردن علائم نگارشی اضافه از متن برای تحلیل بهتر
      const normalizedText = cleanedText.replace(/[.,،:;؛!?؟]/g, ' ').replace(/\s+/g, ' ').trim();
      
      // ساختار داده‌ای برای نگهداری عناصر استخراج شده
      const extractedInfo: {
        city?: string,           // نام شهر
        district?: string,       // نام منطقه یا خیابان
        propertyType?: string,   // نوع ملک (آپارتمان، ویلا، زمین و...)
        dealType?: string,       // نوع معامله (خرید، فروش، اجاره، رهن)
        priceRange?: string,     // محدوده قیمت
      } = {};
      
      // استخراج نام شهر
      const cityRegex = /\b(تهران|اصفهان|مشهد|شیراز|تبریز|اهواز|کرج|قم|کرمانشاه|رشت|ارومیه|زاهدان|همدان|کرمان|یزد|اردبیل|بندرعباس|قزوین|زنجان|ساری|گرگان|خرم آباد|سنندج)\b/i;
      const cityMatch = normalizedText.match(cityRegex);
      if (cityMatch) {
        extractedInfo.city = cityMatch[1];
        console.log('شهر یافت شده:', extractedInfo.city);
      }
      
      // استخراج نام منطقه یا خیابان
      const districtRegex = /\b(?:منطقه|محله|خیابان|بلوار|میدان|شهرک|محدوده)\s+(\d+|[آ-ی\s]+?)(?:\s|$)|در\s+(\d+|[آ-ی\s]+?)(?:\s|$)|در\s+(ونک|تجریش|فرمانیه|پاسداران|نیاوران|جردن|زعفرانیه|الهیه|اقدسیه|دروس|شهرک غرب|سعادت آباد|یوسف آباد|امیرآباد|پونک)\b/i;
      const districtMatch = normalizedText.match(districtRegex);
      if (districtMatch) {
        extractedInfo.district = districtMatch[1] || districtMatch[2] || districtMatch[3];
        console.log('منطقه یافت شده:', extractedInfo.district);
      } else {
        // جستجوی مستقیم نام مناطق معروف بدون نیاز به کلمه "منطقه"
        const famousDistrictRegex = /\b(ونک|تجریش|فرمانیه|پاسداران|نیاوران|جردن|زعفرانیه|الهیه|اقدسیه|دروس|شهرک غرب|سعادت آباد|یوسف آباد|امیرآباد|پونک)\b/i;
        const famousDistrictMatch = normalizedText.match(famousDistrictRegex);
        if (famousDistrictMatch) {
          extractedInfo.district = famousDistrictMatch[1];
          console.log('منطقه معروف یافت شده:', extractedInfo.district);
        }
      }
      
      // استخراج نوع ملک
      const propertyTypeRegex = /\b(آپارتمان|خانه|ویلا|زمین|ملک|مغازه|دفتر|سوله|سوئیت|مستغلات|واحد|برج|پنت هاوس|دوبلکس|تک واحدی|تجاری|مسکونی|اداری|صنعتی)\b/i;
      const propertyTypeMatch = normalizedText.match(propertyTypeRegex);
      if (propertyTypeMatch) {
        extractedInfo.propertyType = propertyTypeMatch[1];
        console.log('نوع ملک یافت شده:', extractedInfo.propertyType);
      }
      
      // استخراج نوع معامله
      const dealTypeRegex = /\b(خرید|فروش|اجاره|رهن|پیش فروش|معاوضه|مشارکت در ساخت|سرمایه گذاری)\b/i;
      const dealTypeMatch = normalizedText.match(dealTypeRegex);
      if (dealTypeMatch) {
        extractedInfo.dealType = dealTypeMatch[1];
        console.log('نوع معامله یافت شده:', extractedInfo.dealType);
      }
      
      // استخراج محدوده قیمت
      const priceRangeRegex = /([\d.,]+)\s*(?:میلیارد|میلیون|هزار|تومان|میلیون تومان|میلیارد تومان)/i;
      const priceRangeMatch = normalizedText.match(priceRangeRegex);
      if (priceRangeMatch) {
        extractedInfo.priceRange = priceRangeMatch[0];
        console.log('محدوده قیمت یافت شده:', extractedInfo.priceRange);
      }
      
      console.log('اطلاعات استخراج شده:', extractedInfo);
      
      // ساخت عنوان بر اساس اطلاعات استخراج شده
      let titleParts: string[] = [];
      
      // افزودن نوع معامله به عنوان
      if (extractedInfo.dealType) {
        titleParts.push(extractedInfo.dealType);
      }
      
      // افزودن نوع ملک به عنوان
      if (extractedInfo.propertyType) {
        titleParts.push(extractedInfo.propertyType);
      }
      
      // افزودن منطقه/خیابان به عنوان
      if (extractedInfo.district) {
        titleParts.push(extractedInfo.district);
      }
      
      // افزودن شهر به عنوان
      if (extractedInfo.city) {
        titleParts.push(extractedInfo.city);
      }
      
      // افزودن محدوده قیمت به عنوان (اگر همه اطلاعات دیگر موجود باشد)
      if (extractedInfo.priceRange && titleParts.length > 0) {
        titleParts.push(extractedInfo.priceRange);
      }
      
      // تولید عنوان نهایی
      let title: string;
      if (titleParts.length > 0) {
        // اگر اطلاعات کافی استخراج شده است، عنوان معنادار بسازیم
        title = titleParts.join(' در ');
        console.log('عنوان تولید شده از اطلاعات استخراج شده:', title);
      } else {
        // بررسی کنیم آیا پیام کاربر یک سوال معنادار است
        if (userMessage.length > 10 && (userMessage.includes('؟') || userMessage.includes('?'))) {
          // عنوان را از سوال کاربر استخراج کنیم
          let questionTitle = userMessage.replace(/[؟?].*$/, '').trim();
          // محدود کردن طول عنوان
          title = questionTitle.length > 40 ? questionTitle.substring(0, 37) + '...' : questionTitle;
          console.log('عنوان استخراج شده از سوال:', title);
        } else if (userMessage.length >= 10 && userMessage.length <= 50) {
          // اگر پیام مناسب است، از خود پیام استفاده کنیم
          title = userMessage;
          console.log('استفاده از خود پیام به عنوان عنوان:', title);
        } else if (userMessage.length > 50) {
          // یافتن اولین نقطه یا علامت نگارشی مناسب برای برش دادن
          const punctuation = ['.', '،', '؛', '!', '\n'];
          let cutIndex = -1;
          
          for (const punct of punctuation) {
            const index = userMessage.indexOf(punct, 10);
            if (index > 0 && index < 50) {
              cutIndex = index;
              break;
            }
          }
          
          // اگر نقطه مناسبی یافت شد، برش بزنیم، در غیر این صورت در کاراکتر 40 برش می‌زنیم
          title = cutIndex > 0 
            ? userMessage.substring(0, cutIndex + 1).trim() 
            : userMessage.substring(0, 37) + '...';
          
          console.log('عنوان خلاصه شده از پیام طولانی:', title);
        } else {
          // اگر هیچ اطلاعاتی استخراج نشد، از عنوان پیش‌فرض استفاده کنیم
          title = `گفتگوی متفرقه ${userName} با هوشی`;
          console.log('استفاده از عنوان پیش‌فرض برای گفتگوی متفرقه');
        }
      }
      
      return title;
    } catch (error) {
      console.error('خطا در تحلیل محتوا برای تولید عنوان:', error);
      // در صورت خطا، عنوان پیش‌فرض تولید می‌کنیم
      return `گفتگوی مجتبی با هوشی`;
    }
  };

  if (dataLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-center p-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mr-2"></div>
          <span>در حال بارگیری مکالمه...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ChatInterface 
        messages={messages}
        onSendMessage={handleSendMessage}
        onEditMessage={handleEditMessage}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ChatPage; 