import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChatBubbleLeftRightIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import dbService from '../services/db';

interface ConversationPreview {
  id: number;
  title: string;
  updated_at: string;
}

const ConversationsPage: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<number[]>([]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const allConversations = await dbService.getConversations() as ConversationPreview[];
      setConversations(allConversations);
    } catch (error) {
      console.error('خطا در بارگیری گفتگوها:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // تابع فرمت‌سازی تاریخ به صورت نسبی یا کامل
  const formatDate = (dateString: string) => {
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
      return new Date(dateString).toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const toggleSelectConversation = (id: number) => {
    if (selectedConversations.includes(id)) {
      setSelectedConversations(selectedConversations.filter(convId => convId !== id));
    } else {
      setSelectedConversations([...selectedConversations, id]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedConversations.length === 0 || isDeleting) return;
    
    if (!window.confirm(`آیا از حذف ${selectedConversations.length} گفتگوی انتخاب شده اطمینان دارید؟`)) {
      return;
    }
    
    try {
      setIsDeleting(true);
      
      // حذف گفتگوهای انتخاب شده
      for (const id of selectedConversations) {
        await dbService.deleteConversation(id);
      }
      
      // پاکسازی انتخاب‌ها و بارگیری مجدد لیست
      setSelectedConversations([]);
      await loadConversations();
    } catch (error) {
      console.error('خطا در حذف گفتگوها:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 md:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center mb-6">
            <Link to="/" className="text-gray-500 hover:text-gray-700">
              بازگشت به صفحه اصلی
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">همه گفتگوها</h1>
          </div>

          <div className="flex justify-between items-center mb-6">
            <button
              onClick={handleDeleteSelected}
              disabled={selectedConversations.length === 0 || isDeleting}
              className={`btn ${selectedConversations.length > 0 ? 'btn-danger' : 'btn-disabled'} flex items-center`}
            >
              {isDeleting ? (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></span>
              ) : (
                <TrashIcon className="h-5 w-5 ml-2" />
              )}
              حذف انتخاب شده ({selectedConversations.length})
            </button>

            <Link
              to="/new-chat"
              className="btn btn-primary flex items-center"
            >
              <PlusIcon className="h-5 w-5 ml-2" />
              گفتگوی جدید
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : conversations.length > 0 ? (
            <div className="bg-white rounded-lg shadow divide-y">
              {conversations.map((conv) => (
                <div 
                  key={conv.id}
                  className="p-4 hover:bg-gray-50 transition-colors flex items-center"
                >
                  <div className="mr-4">
                    <input
                      type="checkbox"
                      checked={selectedConversations.includes(conv.id)}
                      onChange={() => toggleSelectConversation(conv.id)}
                      className="h-5 w-5 text-primary rounded focus:ring-primary"
                    />
                  </div>
                  
                  <Link 
                    to={`/chat/${conv.id}`}
                    className="flex-grow flex items-center justify-between"
                  >
                    <div className="flex-grow">
                      <h3 className="font-medium text-lg text-right mb-1">{conv.title}</h3>
                      <p className="text-gray-500 text-sm text-right">{formatDate(conv.updated_at)}</p>
                    </div>
                    <ChatBubbleLeftRightIcon className="h-6 w-6 text-gray-400" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <ChatBubbleLeftRightIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-medium text-gray-700 mb-2">هنوز گفتگویی انجام نشده است</h2>
              <p className="text-gray-500 mb-6">برای شروع اولین گفتگو با هوشی، دکمه زیر را کلیک کنید</p>
              <Link
                to="/new-chat"
                className="btn btn-primary inline-flex items-center"
              >
                <PlusIcon className="h-5 w-5 ml-2" />
                شروع گفتگو
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ConversationsPage; 