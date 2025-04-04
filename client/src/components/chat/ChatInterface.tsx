import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, MicrophoneIcon, XCircleIcon, CameraIcon, MapPinIcon, SpeakerWaveIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { Message } from '../../data/conversations';
import speechService from '../../services/speech';
import config from '../../config.json';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  isLoading?: boolean;
  userName?: string;
  assistantName?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onEditMessage,
  isLoading = false,
  userName = config.default_user_name || 'مجتبی',
  assistantName = config.default_assistant_name || 'هوشی'
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [speakingError, setSpeakingError] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // اسکرول به آخرین پیام هنگام دریافت پیام جدید
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // فوکوس روی فیلد ویرایش هنگام شروع ویرایش
  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingMessageId]);

  // بررسی پشتیبانی مرورگر از تشخیص گفتار و تبدیل متن به گفتار
  const speechRecognitionSupported = speechService.isSpeechRecognitionSupported();
  const speechSynthesisSupported = speechService.isSpeechSynthesisSupported();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      onSendMessage(inputMessage);
      setInputMessage('');
      
      // تنظیم مجدد ارتفاع textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    
    // تنظیم خودکار ارتفاع textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(150, textareaRef.current.scrollHeight)}px`;
    }
  };

  const toggleRecording = () => {
    if (!speechRecognitionSupported) {
      setRecordingError('مرورگر شما از تشخیص گفتار پشتیبانی نمی‌کند');
      return;
    }

    if (isRecording) {
      // توقف ضبط
      speechService.stopRecording();
      setIsRecording(false);
    } else {
      // شروع ضبط
      setRecordingError(null);
      speechService.startRecording(
        // موفقیت
        (text) => {
          setInputMessage((prev) => prev + ' ' + text);
          setIsRecording(false);
          // فوکوس روی textarea بعد از تشخیص گفتار
          textareaRef.current?.focus();
        },
        // خطا
        (error) => {
          setRecordingError(error);
          setIsRecording(false);
        }
      ).then((started) => {
        if (started) {
          setIsRecording(true);
        }
      }).catch(error => {
        console.error("خطا در شروع ضبط صدا:", error);
        setRecordingError("مشکل در راه‌اندازی ضبط صدا");
      });
    }
  };

  // تبدیل متن به گفتار
  const speakText = async (text: string) => {
    if (!speechSynthesisSupported) {
      setSpeakingError('مرورگر شما از تبدیل متن به گفتار پشتیبانی نمی‌کند');
      return;
    }

    if (isSpeaking) {
      // توقف خواندن متن در حال اجرا
      speechService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    try {
      setSpeakingError(null);
      setIsSpeaking(true);
      
      // خواندن متن با تنظیمات زبان فارسی
      await speechService.speak(text, {
        rate: 1.0,
        pitch: 1.0
      });
      
      // بعد از اتمام خواندن متن
      setIsSpeaking(false);
    } catch (error) {
      if (typeof error === 'string') {
        setSpeakingError(error);
      } else {
        setSpeakingError('خطا در تبدیل متن به گفتار');
      }
      setIsSpeaking(false);
    }
  };

  // شروع ویرایش پیام
  const startEditing = (message: Message) => {
    setEditingMessageId(message.id);
    setEditText(message.content);
  };

  // لغو ویرایش پیام
  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  // ذخیره تغییرات ویرایش پیام
  const saveEditedMessage = () => {
    if (editingMessageId && onEditMessage && editText.trim()) {
      onEditMessage(editingMessageId, editText);
      setEditingMessageId(null);
      setEditText('');
    }
  };

  // تغییر متن ویرایش
  const handleEditChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value);
  };

  // کلید Enter برای ذخیره ویرایش
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEditedMessage();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
    const isUser = message.role === 'user';
    const name = isUser ? userName : assistantName;
    const isEditing = message.id === editingMessageId;

    // تغییر سبک پیام‌های هوشی برای خودمانی‌تر بودن
    const formatAssistantMessage = (content: string) => {
      if (!isUser) {
        // اضافه کردن ایموجی های مناسب به پیام‌های هوشی
        if (content.includes('سلام') || content.includes('درود')) {
          content = `👋 ${content}`;
        }
        
        if (content.includes('متأسفم') || content.includes('شرمنده')) {
          content = `😔 ${content}`;
        }
        
        if (content.includes('خوشحالم') || content.includes('عالیه')) {
          content = `😊 ${content}`;
        }
        
        // جایگزینی عبارات رسمی با عبارات خودمانی
        content = content
          .replace('لطفاً', 'لطفا')
          .replace('می‌توانید', 'می‌تونی')
          .replace('می‌توانم', 'می‌تونم')
          .replace('هستید', 'هستی')
          .replace('می‌باشد', 'هست')
          .replace('چطور می‌توانم کمکتان کنم', `${userName} عزیز، چطور می‌تونم کمکت کنم`);
      }
      
      return content;
    };

    return (
      <div className={`flex ${isUser ? 'justify-start' : 'justify-end'} mb-4 group`}>
        <div
          className={`relative max-w-[80%] px-4 py-3 rounded-lg shadow-sm ${
            isUser
              ? 'bg-primary text-white rounded-tr-none ml-2'
              : 'bg-white text-gray-800 rounded-tl-none mr-2 border border-gray-200'
          }`}
        >
          <div className="absolute top-0 text-xs text-gray-500 font-bold rtl">
            {name}
          </div>
          
          {isEditing ? (
            // حالت ویرایش پیام
            <div className="mt-4">
              <textarea
                ref={editInputRef}
                className="w-full p-2 border border-gray-300 rounded text-right resize-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
                value={editText}
                onChange={handleEditChange}
                onKeyDown={handleEditKeyDown}
                rows={Math.min(5, editText.split('\n').length)}
              />
              <div className="flex justify-end mt-2 space-x-2 rtl">
                <button 
                  onClick={cancelEditing}
                  className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                  title="لغو ویرایش"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
                <button 
                  onClick={saveEditedMessage}
                  className="p-1 rounded-full bg-green-100 text-green-600 hover:bg-green-200"
                  title="ذخیره تغییرات"
                >
                  <CheckIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ) : (
            // نمایش عادی پیام
            <p className="mt-4 text-sm whitespace-pre-wrap text-right">
              {isUser ? message.content : formatAssistantMessage(message.content)}
            </p>
          )}
          
          <div className="text-xs opacity-70 mt-1 flex justify-between items-center">
            <span>
              {new Date(message.timestamp).toLocaleTimeString('fa-IR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            
            {/* دکمه‌های عملیات روی پیام (ویرایش و خواندن صوتی) */}
            <div className="flex items-center space-x-1 rtl opacity-0 group-hover:opacity-100 transition-opacity">
              {onEditMessage && !isEditing && (
                <button
                  onClick={() => startEditing(message)}
                  className="p-1 rounded-full hover:bg-gray-200 text-gray-500"
                  title="ویرایش پیام"
                >
                  <PencilIcon className="h-3 w-3" />
                </button>
              )}
              
              {speechSynthesisSupported && !isEditing && (
                <button
                  onClick={() => speakText(isUser ? message.content : formatAssistantMessage(message.content))}
                  className={`p-1 rounded-full hover:bg-gray-200 ${isSpeaking ? 'text-blue-500' : 'text-gray-500'}`}
                  title={isSpeaking ? 'توقف خواندن' : 'خواندن با صدا'}
                >
                  <SpeakerWaveIcon className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {isLoading && (
          <div className="flex justify-end mb-4">
            <div className="bg-white text-gray-800 rounded-lg rounded-tl-none shadow-sm px-4 py-3 mr-2 border border-gray-200">
              <div className="flex space-x-2 rtl">
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t border-gray-200 bg-white p-3">
        {recordingError && (
          <div className="bg-red-100 text-red-700 p-2 mb-2 rounded text-sm text-center">
            {recordingError}
          </div>
        )}
        
        {speakingError && (
          <div className="bg-red-100 text-red-700 p-2 mb-2 rounded text-sm text-center">
            {speakingError}
          </div>
        )}
        
        {showToolbar && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex justify-end space-x-2 rtl mb-2"
          >
            <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
              <CameraIcon className="h-5 w-5 text-gray-600" />
            </button>
            <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
              <MapPinIcon className="h-5 w-5 text-gray-600" />
            </button>
          </motion.div>
        )}
        
        <div className={`flex items-end border rounded-xl shadow-sm bg-white transition-all duration-300 ${isFocused ? 'border-primary ring-2 ring-blue-100' : 'border-gray-300'}`}>
          <textarea
            ref={textareaRef}
            rows={1}
            className="flex-1 resize-none max-h-36 p-3 bg-transparent border-none focus:ring-0 rounded-xl text-right"
            placeholder={`پیام خود را بنویسید... ${speechRecognitionSupported ? '(یا از میکروفون استفاده کنید)' : ''}`}
            value={inputMessage}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true);
              setShowToolbar(true);
            }}
            onBlur={() => setIsFocused(false)}
          />
          
          <div className="flex items-center px-2 py-1 space-x-1 rtl">
            {inputMessage && (
              <button
                onClick={() => setInputMessage('')}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <XCircleIcon className="h-5 w-5 text-gray-400" />
              </button>
            )}
            
            {speechRecognitionSupported && (
              <button
                onClick={toggleRecording}
                className={`p-2 rounded-full ${
                  isRecording ? 'bg-red-100 text-red-500' : 'hover:bg-gray-100'
                }`}
                title={isRecording ? 'توقف ضبط صدا' : 'ضبط صدا'}
              >
                <MicrophoneIcon className={`h-5 w-5 ${isRecording ? 'text-red-500' : 'text-gray-500'}`} />
              </button>
            )}
            
            {speechSynthesisSupported && inputMessage && (
              <button
                onClick={() => speakText(inputMessage)}
                className={`p-2 rounded-full ${
                  isSpeaking ? 'bg-blue-100 text-blue-500' : 'hover:bg-gray-100'
                }`}
                title={isSpeaking ? 'توقف خواندن' : 'خواندن با صدا'}
              >
                <SpeakerWaveIcon className={`h-5 w-5 ${isSpeaking ? 'text-blue-500' : 'text-gray-500'}`} />
              </button>
            )}
            
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() && !isRecording}
              className={`p-2 rounded-full ${
                inputMessage.trim() || isRecording
                  ? 'bg-primary text-white hover:bg-primary-dark'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              <PaperAirplaneIcon className="h-5 w-5 rotate-90 transform" />
            </button>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 text-center mt-2">
          برای ارسال پیام از کلید Enter و برای رفتن به خط جدید از Shift+Enter استفاده کنید
          {speechRecognitionSupported && <span> | برای ضبط صدا روی دکمه میکروفون کلیک کنید</span>}
          {speechSynthesisSupported && <span> | برای شنیدن متن روی دکمه بلندگو کلیک کنید</span>}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface; 