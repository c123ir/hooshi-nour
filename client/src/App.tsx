import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import ConversationsPage from './pages/ConversationsPage';
import UsageDashboard from './pages/UsageDashboard';
import AboutPage from './pages/AboutPage';
import './App.css';

function App() {
  const [theme, setTheme] = useState<string>('');
  
  // اعمال تنظیمات ظاهری هنگام بارگذاری برنامه
  useEffect(() => {
    // بارگذاری تنظیمات از localStorage
    const storedSettings = localStorage.getItem('hooshi_settings');
    if (storedSettings) {
      try {
        const settings = JSON.parse(storedSettings);
        
        // اعمال تم
        const root = document.documentElement;
        let currentTheme = '';
        
        if (settings.theme === 'dark') {
          root.classList.add('dark');
          currentTheme = 'dark';
        } else if (settings.theme === 'light') {
          root.classList.remove('dark');
          currentTheme = 'light';
        } else if (settings.theme === 'system') {
          // برای حالت سیستم از media query استفاده می‌کنیم
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) {
            root.classList.add('dark');
            currentTheme = 'dark';
          } else {
            root.classList.remove('dark');
            currentTheme = 'light';
          }
        }
        
        setTheme(currentTheme);
        
        // اعمال اندازه متن
        if (settings.fontSize) {
          root.style.setProperty('--font-size-base', `${settings.fontSize}px`);
        }
        
        console.log('تنظیمات ظاهری با موفقیت اعمال شد');
      } catch (error) {
        console.error('خطا در اعمال تنظیمات ظاهری:', error);
      }
    }
  }, []);

  return (
    <div className={`App h-screen flex flex-col ${theme}`}>
      <Router>
        <div className="flex h-full overflow-hidden">
          {/* نوار کناری */}
          <Sidebar />
          
          {/* محتوای اصلی */}
          <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3">
            <Routes>
              <Route path="/" element={<Navigate to="/chat/new" replace />} />
              <Route path="/chat/:id" element={<ChatPage />} />
              <Route path="/chat/new" element={<ChatPage />} />
              <Route path="/conversations" element={<ConversationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/usage" element={<UsageDashboard />} />
              <Route path="/about" element={<AboutPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </div>
  );
}

export default App;
