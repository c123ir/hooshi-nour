import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChatBubbleLeftRightIcon, PlusIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { properties } from '../data/properties';
import dbService, { DbConversation } from '../services/db';

interface ConversationPreview {
  id: number;
  title: string;
  updated_at: string;
}

const HomePage: React.FC = () => {
  const [recentConversations, setRecentConversations] = useState<ConversationPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const featuredProperties = properties.slice(0, 3);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        setIsLoading(true);
        const conversations = await dbService.getConversations() as ConversationPreview[];
        // فقط ۵ گفتگوی اخیر را نمایش می‌دهیم
        setRecentConversations(conversations.slice(0, 5));
      } catch (error) {
        console.error('خطا در بارگیری گفتگوها:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, []);

  // تابع فرمت‌سازی تاریخ به صورت نسبی (مثلا "۳ روز قبل")
  const formatRelativeDate = (dateString: string) => {
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
      return new Date(dateString).toLocaleDateString('fa-IR');
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 md:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">به <span className="text-primary">هوشی</span> خوش آمدید</h1>
          <p className="text-xl text-gray-600">دستیار هوشمند مشاوره املاک شما</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="card"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4 text-right">گفتگوی جدید</h2>
            <p className="text-gray-600 mb-6 text-right">یک گفتگوی جدید برای یافتن ملک مورد نظر خود آغاز کنید.</p>
            <Link
              to="/new-chat"
              className="btn btn-primary flex items-center justify-center w-full"
            >
              <PlusIcon className="h-5 w-5 ml-2" />
              شروع گفتگو
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="card"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4 text-right">گفتگوهای اخیر</h2>
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : recentConversations.length > 0 ? (
                recentConversations.map((conv) => (
                  <Link
                    key={conv.id}
                    to={`/chat/${conv.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-gray-400 text-sm">
                      {formatRelativeDate(conv.updated_at)}
                    </span>
                    <span className="font-medium text-right">{conv.title}</span>
                  </Link>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500 mb-3">هنوز گفتگویی انجام نشده است</p>
                  <Link to="/new-chat" className="text-primary hover:underline">
                    اولین گفتگو را شروع کنید
                  </Link>
                </div>
              )}
            </div>
            {recentConversations.length > 0 && (
              <Link to="/conversations" className="text-primary hover:underline text-sm block text-center mt-4">
                مشاهده همه گفتگوها
              </Link>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-right">املاک پیشنهادی</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredProperties.map((property) => (
              <motion.div
                key={property.id}
                whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                className="card overflow-hidden"
              >
                <div className="h-48 overflow-hidden mb-4 -mx-6 -mt-6">
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-bold text-lg mb-2 text-right">{property.title}</h3>
                <p className="text-gray-500 text-sm mb-2 text-right">{property.location}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm">{property.size} متر</span>
                  <span className="font-bold text-primary">
                    {(property.price / 1000000000).toFixed(1)} میلیارد
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center"
        >
          <Link
            to="/new-chat"
            className="btn btn-outline inline-flex items-center"
          >
            <ChatBubbleLeftRightIcon className="h-5 w-5 ml-2" />
            شروع جستجو با هوشی
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage; 