import React, { useState, useEffect } from 'react';
import { ChatBubbleLeftRightIcon, HomeIcon, Cog6ToothIcon, PlusIcon, ChevronDoubleRightIcon, ChevronDoubleLeftIcon, ChevronDownIcon, ChevronUpIcon, PencilIcon, CheckIcon, XMarkIcon, TrashIcon, ListBulletIcon, ChartBarIcon, Cog8ToothIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import dbService from '../../services/db';

interface ConversationPreview {
  id: number;
  title: string;
  updated_at: string;
}

type SidebarState = 'full' | 'icons' | 'hidden';

interface SidebarProps {
  defaultState?: SidebarState;
}

export const Sidebar: React.FC<SidebarProps> = ({ defaultState = 'full' }) => {
  const [state, setState] = useState<SidebarState>(defaultState);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [recentConversations, setRecentConversations] = useState<ConversationPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecentExpanded, setIsRecentExpanded] = useState(true);
  const [editingConversationId, setEditingConversationId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setState('hidden');
      } else if (window.innerWidth < 768) {
        setState('icons');
      } else if (state === 'hidden') {
        setState('full');
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, [state]);

  useEffect(() => {
    // بارگیری گفتگوهای اخیر
    const loadRecentConversations = async () => {
      try {
        setIsLoading(true);
        const conversations = await dbService.getConversations() as ConversationPreview[];
        // فقط ۵ گفتگوی اخیر را نمایش می‌دهیم
        setRecentConversations(conversations.slice(0, 5));
      } catch (error) {
        console.error('خطا در بارگیری گفتگوها برای نوار کناری:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (state === 'full') {
      loadRecentConversations();
    }
  }, [state, location.pathname]); // بارگیری مجدد هنگام تغییر مسیر برای به‌روزرسانی

  const toggleSidebar = () => {
    setState(prev => {
      if (prev === 'full') return 'icons';
      if (prev === 'icons') return 'hidden';
      return 'full';
    });
  };

  const startEditingTitle = (conv: ConversationPreview) => {
    setEditingConversationId(conv.id);
    setEditTitle(conv.title);
  };

  const saveTitle = async () => {
    if (!editingConversationId || !editTitle.trim()) {
      setEditingConversationId(null);
      return;
    }

    try {
      await dbService.updateConversationTitle(editingConversationId, editTitle.trim());
      
      // به‌روزرسانی لیست گفتگوها در حافظه
      setRecentConversations(prev => 
        prev.map(conv => 
          conv.id === editingConversationId 
            ? { ...conv, title: editTitle.trim() } 
            : conv
        )
      );
    } catch (error) {
      console.error('خطا در تغییر نام گفتگو:', error);
    } finally {
      setEditingConversationId(null);
    }
  };

  const cancelEditing = () => {
    setEditingConversationId(null);
  };

  const deleteConversation = async (conversationId: number) => {
    try {
      await dbService.deleteConversation(conversationId);
      // حذف گفتگو از لیست
      setRecentConversations(prev => prev.filter(conv => conv.id !== conversationId));
    } catch (error) {
      console.error('خطا در حذف گفتگو:', error);
      alert('خطا در حذف گفتگو. لطفاً مجدداً تلاش کنید.');
    }
  };

  // تابع فرمت‌سازی تاریخ به صورت کوتاه
  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return `${diffMinutes} دقیقه قبل`;
    } else if (diffHours < 24) {
      return `${diffHours} ساعت قبل`;
    } else if (diffDays < 7) {
      return `${diffDays} روز قبل`;
    } else {
      // فقط تاریخ (بدون ساعت)
      return date.toLocaleDateString('fa-IR', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const sidebarWidth = state === 'full' ? 'w-64' : state === 'icons' ? 'w-16' : 'w-0';
  
  const getNextStateIcon = () => {
    if (state === 'full') return <ChevronDoubleRightIcon className="h-5 w-5" />;
    if (state === 'icons') return <ChevronDoubleLeftIcon className="h-5 w-5" />;
    return <ChevronDoubleRightIcon className="h-5 w-5" />;
  };

  const menuItem = (icon: React.ReactNode, text: string, to: string) => {
    const isActive = location.pathname === to;
    const itemId = to;
    
    return (
      <motion.div
        className={`relative flex items-center justify-end ${state === 'full' ? 'justify-between' : 'justify-center'} 
                    p-3 my-1 rounded-lg cursor-pointer
                    ${isActive 
                      ? 'bg-primary text-white' 
                      : 'text-gray-700 hover:bg-gray-100'}`}
        whileHover={{ scale: 1.03 }}
        onMouseEnter={() => setHoveredItem(itemId)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <Link to={to} className="flex items-center w-full">
          {state === 'full' && (
            <span className="flex-grow text-right ml-3">{text}</span>
          )}
          <div 
            className={`flex items-center justify-center rounded-full p-1.5
                      ${isActive ? 'bg-white text-primary' : 'bg-gray-200 text-gray-600'}`}
          >
            {icon}
          </div>
        </Link>
        
        {state === 'icons' && hoveredItem === itemId && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: -5 }}
            className="absolute right-16 bg-gray-800 text-white px-2 py-1 rounded z-50 whitespace-nowrap"
          >
            {text}
          </motion.div>
        )}
      </motion.div>
    );
  };

  return (
    <>
      <motion.div 
        className={`fixed top-16 right-0 h-screen ${sidebarWidth} bg-white border-l border-gray-200 overflow-hidden transition-all duration-300 ease-in-out z-40 shadow-md`}
        initial={false}
        animate={{ width: state === 'hidden' ? 0 : state === 'icons' ? 64 : 256 }}
      >
        <div className="flex flex-col p-3 h-full">
          <div className={`mt-2 ${state === 'full' ? 'text-right' : 'text-center'}`}>
            {state === 'full' && <h2 className="text-xl font-bold text-primary mb-2">هوشی</h2>}
          </div>
          
          <div className="flex-1 overflow-y-auto pt-3">
            {menuItem(
              <HomeIcon className="h-5 w-5" />,
              "صفحه اصلی",
              "/"
            )}
            
            {menuItem(
              <PlusIcon className="h-5 w-5" />,
              "گفتگوی جدید",
              "/new-chat"
            )}
            
            {menuItem(
              <ChatBubbleLeftRightIcon className="h-5 w-5" />,
              "همه گفتگوها",
              "/conversations"
            )}
            
            {state === 'full' && (
              <div className="mt-6 mb-2">
                <button 
                  className="flex items-center justify-between w-full text-sm font-semibold text-gray-500 text-right pr-2 hover:text-gray-700"
                  onClick={() => setIsRecentExpanded(!isRecentExpanded)}
                >
                  <span className="text-gray-500">
                    {isRecentExpanded ? 
                      <ChevronUpIcon className="h-4 w-4" /> : 
                      <ChevronDownIcon className="h-4 w-4" />
                    }
                  </span>
                  گفتگوهای اخیر
                </button>
                <div className="border-b border-gray-200 my-2"></div>
              </div>
            )}
            
            {state === 'full' && isLoading && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              </div>
            )}
            
            {state === 'full' && !isLoading && recentConversations.length === 0 && (
              <div className="text-gray-500 text-sm text-center py-2">
                هنوز گفتگویی انجام نشده است
              </div>
            )}
            
            <AnimatePresence>
              {state === 'full' && isRecentExpanded && !isLoading && recentConversations.map(conv => (
                <motion.div 
                  key={conv.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-2 my-1 rounded-lg cursor-pointer text-right text-sm hover:bg-gray-100
                            ${location.pathname === `/chat/${conv.id}` ? 'bg-gray-100 font-semibold' : ''}`}
                >
                  {editingConversationId === conv.id ? (
                    <div className="flex items-center">
                      <div className="flex-shrink-0 space-x-1 space-x-reverse">
                        <button onClick={saveTitle} className="text-green-500 hover:text-green-600">
                          <CheckIcon className="h-4 w-4" />
                        </button>
                        <button onClick={cancelEditing} className="text-red-500 hover:text-red-600">
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-grow text-right w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-primary"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTitle();
                          if (e.key === 'Escape') cancelEditing();
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center group">
                      <Link 
                        to={`/chat/${conv.id}`} 
                        className="flex-grow truncate flex flex-col"
                      >
                        <span className="block truncate">{conv.title}</span>
                        <span className="text-xs text-gray-400">{formatShortDate(conv.updated_at)}</span>
                      </Link>
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            startEditingTitle(conv);
                          }}
                          className="text-gray-400 hover:text-primary mr-1.5"
                          title="ویرایش نام گفتگو"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (window.confirm(`آیا از حذف گفتگوی «${conv.title}» اطمینان دارید؟`)) {
                              deleteConversation(conv.id);
                            }
                          }}
                          className="text-gray-400 hover:text-red-500"
                          title="حذف گفتگو"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            
            <div className="space-y-1 mt-2">
              <Link
                to="/conversations"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  location.pathname === '/conversations'
                    ? 'bg-primary text-white dark:bg-primary-dark'
                    : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <ListBulletIcon className="mr-3 flex-shrink-0 h-5 w-5" />
                <span>گفتگوهای من</span>
              </Link>
              
              <Link
                to="/usage"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  location.pathname === '/usage'
                    ? 'bg-primary text-white dark:bg-primary-dark'
                    : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <ChartBarIcon className="mr-3 flex-shrink-0 h-5 w-5" />
                <span>داشبورد مصرف</span>
              </Link>
              
              <Link
                to="/settings"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  location.pathname === '/settings'
                    ? 'bg-primary text-white dark:bg-primary-dark'
                    : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <Cog8ToothIcon className="mr-3 flex-shrink-0 h-5 w-5" />
                <span>تنظیمات</span>
              </Link>
              
              <Link
                to="/about"
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  location.pathname === '/about'
                    ? 'bg-primary text-white dark:bg-primary-dark'
                    : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <InformationCircleIcon className="mr-3 flex-shrink-0 h-5 w-5" />
                <span>درباره ما</span>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
      
      <button
        onClick={toggleSidebar}
        className={`fixed top-3.5 right-3 z-50 p-2 rounded-full bg-white shadow-md hover:bg-gray-100
                  ${state === 'hidden' ? 'right-3' : state === 'icons' ? 'right-16' : 'right-64'} 
                  transition-all duration-300`}
      >
        {getNextStateIcon()}
      </button>
    </>
  );
};

export default Sidebar; 