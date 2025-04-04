import React, { useState, useEffect } from 'react';
import { Switch } from '@headlessui/react';
import { ChevronLeftIcon, CheckIcon, DocumentTextIcon, UserIcon, CogIcon, SunIcon, MoonIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';
import config from '../config.json';
import axios from 'axios';
import dbService from '../services/db';

interface SettingsGroup {
  title: string;
  settings: Setting[];
}

interface Setting {
  id: string;
  label: string;
  type: 'text' | 'select' | 'toggle' | 'range' | 'group';
  value: any;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  children?: Setting[];
  description?: string;
  disabled?: boolean;
  dependsOn?: { id: string; value: any };
}

// تعریف نوع‌داده‌های لازم برای آبجکت config
interface SpeechConfig {
  use_openai_api: boolean;
  voice_recognition: {
    enabled: boolean;
    use_openai_api: boolean;
    openai_model: string;
  };
  text_to_speech: {
    enabled: boolean;
    use_openai_api: boolean;
    openai_voice: string;
    openai_model: string;
    speed: number;
  };
}

interface AppConfig {
  api_key: string;
  db_host: string;
  db_port: number;
  db_name: string;
  db_user: string;
  db_password: string;
  default_user_name: string;
  default_assistant_name: string;
  prioritize_memory: boolean;
  speech?: SpeechConfig;
}

const SettingsPage: React.FC = () => {
  // بارگذاری تنظیمات اولیه از فایل کانفیگ یا localStorage
  const loadSettingsFromConfig = (): SettingsGroup[] => {
    // بخش تنظیمات آماده
    const baseSettings = [
      {
        title: 'تنظیمات شخصی',
        settings: [
          {
            id: 'userName',
            label: 'نام کاربر',
            type: 'text' as const,
            value: config.default_user_name || 'مجتبی',
            description: 'نام شما برای نمایش در گفتگوها'
          },
          {
            id: 'assistantName',
            label: 'نام دستیار',
            type: 'text' as const,
            value: config.default_assistant_name || 'هوشی',
            description: 'نام دستیار مجازی'
          },
          {
            id: 'prioritizeMemory',
            label: 'اولویت حافظه',
            type: 'toggle' as const,
            value: config.prioritize_memory || false,
            description: 'استفاده از حافظه گفتگوهای قبلی در پاسخ‌ها'
          },
        ]
      },
      {
        title: 'تنظیمات صدا و گفتار',
        settings: [
          {
            id: 'speechUseOpenAI',
            label: 'استفاده از هوش مصنوعی برای صدا',
            type: 'toggle' as const,
            value: config.speech?.use_openai_api || false,
            description: 'استفاده از API اوپن‌ای برای تشخیص گفتار و تبدیل متن به صدا'
          },
          {
            id: 'voiceRecognition',
            label: 'تشخیص گفتار',
            type: 'group' as const,
            value: true,
            children: [
              {
                id: 'voiceRecognitionEnabled',
                label: 'فعال‌سازی تشخیص گفتار',
                type: 'toggle' as const,
                value: config.speech?.voice_recognition?.enabled || true,
                description: 'امکان ارسال پیام با استفاده از میکروفون'
              },
              {
                id: 'voiceRecognitionUseOpenAI',
                label: 'استفاده از Whisper اوپن‌ای',
                type: 'toggle' as const,
                value: config.speech?.voice_recognition?.use_openai_api || false,
                description: 'استفاده از مدل Whisper برای تشخیص دقیق‌تر گفتار فارسی',
                dependsOn: { id: 'speechUseOpenAI', value: true }
              },
              {
                id: 'voiceRecognitionModel',
                label: 'مدل تشخیص گفتار',
                type: 'select' as const,
                value: config.speech?.voice_recognition?.openai_model || 'whisper-1',
                options: [
                  { value: 'whisper-1', label: 'Whisper-1 (استاندارد)' }
                ],
                description: 'مدل مورد استفاده برای تشخیص گفتار',
                dependsOn: { id: 'voiceRecognitionUseOpenAI', value: true }
              }
            ]
          },
          {
            id: 'textToSpeech',
            label: 'تبدیل متن به گفتار',
            type: 'group' as const,
            value: true,
            children: [
              {
                id: 'textToSpeechEnabled',
                label: 'فعال‌سازی تبدیل متن به گفتار',
                type: 'toggle' as const,
                value: config.speech?.text_to_speech?.enabled || true,
                description: 'امکان شنیدن صوتی پیام‌ها'
              },
              {
                id: 'textToSpeechUseOpenAI',
                label: 'استفاده از TTS اوپن‌ای',
                type: 'toggle' as const,
                value: config.speech?.text_to_speech?.use_openai_api || false,
                description: 'استفاده از مدل TTS برای تولید صدای طبیعی‌تر',
                dependsOn: { id: 'speechUseOpenAI', value: true }
              },
              {
                id: 'textToSpeechModel',
                label: 'مدل تبدیل متن به گفتار',
                type: 'select' as const,
                value: config.speech?.text_to_speech?.openai_model || 'tts-1',
                options: [
                  { value: 'tts-1', label: 'TTS-1 (استاندارد)' },
                  { value: 'tts-1-hd', label: 'TTS-1-HD (کیفیت بالا)' }
                ],
                description: 'مدل مورد استفاده برای تبدیل متن به گفتار',
                dependsOn: { id: 'textToSpeechUseOpenAI', value: true }
              },
              {
                id: 'textToSpeechVoice',
                label: 'صدا',
                type: 'select' as const,
                value: config.speech?.text_to_speech?.openai_voice || 'alloy',
                options: [
                  { value: 'alloy', label: 'Alloy (متعادل)' },
                  { value: 'echo', label: 'Echo (عمیق)' },
                  { value: 'fable', label: 'Fable (دوستانه)' },
                  { value: 'onyx', label: 'Onyx (قدرتمند)' },
                  { value: 'nova', label: 'Nova (زنانه)' },
                  { value: 'shimmer', label: 'Shimmer (مثبت)' }
                ],
                description: 'نوع صدا برای تبدیل متن به گفتار',
                dependsOn: { id: 'textToSpeechUseOpenAI', value: true }
              },
              {
                id: 'textToSpeechSpeed',
                label: 'سرعت صحبت',
                type: 'range' as const,
                value: config.speech?.text_to_speech?.speed || 1.0,
                min: 0.5,
                max: 1.5,
                step: 0.1,
                description: 'سرعت خواندن متن',
                dependsOn: { id: 'textToSpeechUseOpenAI', value: true }
              }
            ]
          }
        ]
      },
      {
        title: 'تنظیمات ظاهری',
        settings: [
          {
            id: 'sidebarState',
            label: 'وضعیت سایدبار',
            type: 'select' as const,
            value: 'full',
            options: [
              { value: 'full', label: 'کامل' },
              { value: 'icons', label: 'فقط آیکون‌ها' },
              { value: 'hidden', label: 'مخفی' }
            ]
          },
          {
            id: 'theme',
            label: 'تم',
            type: 'select' as const,
            value: 'light',
            options: [
              { value: 'light', label: 'روشن' },
              { value: 'dark', label: 'تیره' },
              { value: 'system', label: 'مطابق با سیستم' }
            ]
          },
          {
            id: 'fontSize',
            label: 'اندازه متن',
            type: 'range' as const,
            value: 14,
            min: 12,
            max: 20,
            step: 1
          }
        ]
      },
      {
        title: 'تنظیمات پیشرفته',
        settings: [
          {
            id: 'openai_api_key',
            label: 'کلید API اوپن‌ای',
            type: 'text' as const,
            value: '',
            description: 'کلید API اوپن‌ای برای اتصال به سرویس‌های هوش مصنوعی'
          },
          {
            id: 'applySettingsLive',
            label: 'اعمال تنظیمات بدون نیاز به راه‌اندازی مجدد',
            type: 'toggle' as const,
            value: true
          },
          {
            id: 'showDebugInfo',
            label: 'نمایش اطلاعات دیباگ',
            type: 'toggle' as const,
            value: false
          }
        ]
      }
    ];
    
    // بررسی و بارگذاری کلید API از localStorage
    const storedConfig = localStorage.getItem('hooshi_config');
    if (storedConfig) {
      try {
        const configObj = JSON.parse(storedConfig);
        // کلید API را در تنظیمات پیشرفته قرار می‌دهیم
        const advancedGroup = baseSettings.find(g => g.title === 'تنظیمات پیشرفته');
        if (advancedGroup) {
          const apiKeySetting = advancedGroup.settings.find(s => s.id === 'openai_api_key');
          if (apiKeySetting && configObj.api_key) {
            apiKeySetting.value = configObj.api_key;
          }
        }
      } catch (error) {
        console.error('خطا در بارگذاری کانفیگ:', error);
      }
    }
    
    // سپس تنظیمات ذخیره شده در localStorage را بررسی می‌کنیم
    const storedSettings = localStorage.getItem('hooshi_settings');
    
    if (storedSettings) {
      try {
        const parsedSettings = JSON.parse(storedSettings);
        
        // به‌روزرسانی مقادیر با تنظیمات ذخیره شده
        baseSettings.forEach(group => {
          group.settings.forEach(setting => {
            if (setting.type === 'group' && setting.children) {
              setting.children.forEach(child => {
                if (parsedSettings[child.id] !== undefined) {
                  child.value = parsedSettings[child.id];
                }
              });
            } else if (parsedSettings[setting.id] !== undefined) {
              setting.value = parsedSettings[setting.id];
            }
          });
        });
        
        console.log('تنظیمات از localStorage بارگذاری شد');
      } catch (error) {
        console.error('خطا در بارگذاری تنظیمات از localStorage:', error);
      }
    }
    
    return baseSettings;
  };

  const [settings, setSettings] = useState<SettingsGroup[]>(loadSettingsFromConfig());
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [apiUsage, setApiUsage] = useState<any>(null);
  const [isLoadingApiStats, setIsLoadingApiStats] = useState(false);
  const [apiTimeRange, setApiTimeRange] = useState('30'); // پیش‌فرض: 30 روز
  const [activeTab, setActiveTab] = useState('personal'); // تب فعال پیش‌فرض
  const [theme, setTheme] = useState(() => {
    // بررسی تنظیمات ذخیره شده
    const storedSettings = localStorage.getItem('hooshi_settings');
    if (storedSettings) {
      try {
        const parsedSettings = JSON.parse(storedSettings);
        return parsedSettings.theme || 'light';
      } catch (error) {
        return 'light';
      }
    }
    return 'light';
  });
  const [fontSize, setFontSize] = useState(() => {
    // بررسی تنظیمات ذخیره شده
    const storedSettings = localStorage.getItem('hooshi_settings');
    if (storedSettings) {
      try {
        const parsedSettings = JSON.parse(storedSettings);
        return parsedSettings.fontSize || 14;
      } catch (error) {
        return 14;
      }
    }
    return 14;
  });
  
  // بارگذاری آمار مصرف API هنگام بارگیری صفحه
  useEffect(() => {
    loadApiUsageStats();
  }, [apiTimeRange]);
  
  // بارگیری آمار مصرف API
  const loadApiUsageStats = async () => {
    try {
      setIsLoadingApiStats(true);
      
      // محاسبه تاریخ شروع بر اساس بازه زمانی
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(apiTimeRange));
      
      // بارگیری آمار
      const summary = await dbService.getApiUsageSummary(startDate, endDate);
      setApiUsage(summary);
    } catch (error) {
      console.error('خطا در بارگیری آمار مصرف API:', error);
    } finally {
      setIsLoadingApiStats(false);
    }
  };
  
  // پاکسازی سوابق قدیمی مصرف API
  const cleanupOldApiRecords = async () => {
    try {
      const deletedCount = await dbService.cleanupOldApiUsageRecords(60); // حفظ 60 روز آخر
      alert(`${deletedCount} رکورد قدیمی با موفقیت پاکسازی شد.`);
      
      // بارگیری مجدد آمار
      loadApiUsageStats();
    } catch (error) {
      console.error('خطا در پاکسازی سوابق قدیمی:', error);
      alert('خطا در پاکسازی سوابق قدیمی. لطفاً دوباره تلاش کنید.');
    }
  };
  
  // فرمت کردن هزینه به دلار
  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cost);
  };

  // بارگذاری تنظیمات از IndexedDB در ابتدای بارگذاری صفحه
  useEffect(() => {
    const loadSettingsFromDB = async () => {
      try {
        const dbSettings = await dbService.getSettings();
        if (dbSettings) {
          console.log('تنظیمات از IndexedDB بارگذاری شد');
          
          // به‌روزرسانی مقادیر با تنظیمات ذخیره شده
          const newSettings = [...settings];
          
          newSettings.forEach(group => {
            group.settings.forEach(setting => {
              if (setting.type === 'group' && setting.children) {
                setting.children.forEach(child => {
                  if (dbSettings[child.id] !== undefined) {
                    child.value = dbSettings[child.id];
                  }
                });
              } else if (dbSettings[setting.id] !== undefined) {
                setting.value = dbSettings[setting.id];
              }
            });
          });
          
          setSettings(newSettings);
          
          // به‌روزرسانی تم و اندازه متن
          if (dbSettings.theme) setTheme(dbSettings.theme);
          if (dbSettings.fontSize) setFontSize(dbSettings.fontSize);
        }
      } catch (error) {
        console.error('خطا در بارگذاری تنظیمات از IndexedDB:', error);
      }
    };
    
    loadSettingsFromDB();
  }, []);

  const handleChange = (groupIndex: number, settingIndex: number, value: any, childIndex?: number) => {
    const newSettings = [...settings];
    
    if (childIndex !== undefined && newSettings[groupIndex].settings[settingIndex].children) {
      // تغییر در تنظیمات فرزند
      newSettings[groupIndex].settings[settingIndex].children![childIndex].value = value;
    } else {
      // تغییر در تنظیمات اصلی
      newSettings[groupIndex].settings[settingIndex].value = value;
      
      // اگر این تنظیم `speechUseOpenAI` است و مقدار آن تغییر کرده،
      // تنظیمات وابسته را به‌روزرسانی کنیم
      if (newSettings[groupIndex].settings[settingIndex].id === 'speechUseOpenAI') {
        // به‌روزرسانی تنظیمات وابسته
        newSettings.forEach(group => {
          group.settings.forEach(setting => {
            if (setting.children) {
              setting.children.forEach(child => {
                if (child.dependsOn?.id === 'speechUseOpenAI') {
                  // به‌روزرسانی وضعیت غیرفعال بودن
                  child.disabled = !value;
                }
              });
            }
          });
        });
      }
    }
    
    setSettings(newSettings);
    
    // ذخیره خودکار تنظیمات هنگام تغییر مقادیر
    const settingsValues: any = {};
    const configValues: any = {};
    
    newSettings.forEach(group => {
      group.settings.forEach(setting => {
        if (group.title === 'تنظیمات پیشرفته' && setting.id === 'openai_api_key') {
          // کلید API را در کانفیگ ذخیره می‌کنیم
          configValues.api_key = setting.value;
        } else if (setting.type === 'group') {
          setting.children?.forEach(child => {
            settingsValues[child.id] = child.value;
          });
        } else {
          settingsValues[setting.id] = setting.value;
        }
      });
    });
    
    // اضافه کردن تنظیمات تم و اندازه متن
    settingsValues.theme = theme;
    settingsValues.fontSize = fontSize;
    
    // ذخیره در localStorage
    localStorage.setItem('hooshi_settings', JSON.stringify(settingsValues));
    
    // ذخیره کانفیگ در localStorage (اگر تغییر کرده باشد)
    if (Object.keys(configValues).length > 0) {
      // ترکیب با مقادیر موجود
      const existingConfig = JSON.parse(localStorage.getItem('hooshi_config') || '{}');
      const newConfig = { ...existingConfig, ...configValues };
      localStorage.setItem('hooshi_config', JSON.stringify(newConfig));
    }
    
    // ذخیره در IndexedDB
    dbService.saveSettings(settingsValues)
      .then(success => {
        if (!success) {
          console.warn('ذخیره تنظیمات در IndexedDB با مشکل مواجه شد');
        }
      });
    
    // نمایش نشانگر ذخیره تغییرات
    setSaveIndicator(true);
    setTimeout(() => setSaveIndicator(false), 2000);
  };

  const saveSettings = () => {
    try {
      // جمع‌آوری مقادیر از تنظیمات
      const settingsValues: any = {};
      const configValues: any = {};
      
      settings.forEach(group => {
        group.settings.forEach(setting => {
          if (group.title === 'تنظیمات پیشرفته' && setting.id === 'openai_api_key') {
            // کلید API را در کانفیگ ذخیره می‌کنیم
            configValues.api_key = setting.value;
          } else if (setting.type === 'group') {
            setting.children?.forEach(child => {
              settingsValues[child.id] = child.value;
            });
          } else {
            settingsValues[setting.id] = setting.value;
          }
        });
      });
      
      // اضافه کردن تنظیمات تم و اندازه متن
      settingsValues.theme = theme;
      settingsValues.fontSize = fontSize;
      
      // ذخیره تنظیمات در localStorage
      localStorage.setItem('hooshi_settings', JSON.stringify(settingsValues));
      
      // ذخیره کانفیگ در localStorage (اگر تغییر کرده باشد)
      if (Object.keys(configValues).length > 0) {
        // ترکیب با مقادیر موجود
        const existingConfig = JSON.parse(localStorage.getItem('hooshi_config') || '{}');
        const newConfig = { ...existingConfig, ...configValues };
        localStorage.setItem('hooshi_config', JSON.stringify(newConfig));
      }
      
      // ذخیره در IndexedDB
      dbService.saveSettings(settingsValues)
        .then(success => {
          if (!success) {
            console.warn('ذخیره تنظیمات در IndexedDB با مشکل مواجه شد');
          }
        });
      
      // نمایش اعلان موفقیت
      setSaveIndicator(true);
      setTimeout(() => setSaveIndicator(false), 3000);
      
      // اعمال تنظیمات ظاهری
      applyAppearanceSettings();
    } catch (error) {
      console.error('خطا در ذخیره تنظیمات:', error);
      setSaveError('خطا در ذخیره تنظیمات');
      setTimeout(() => setSaveError(null), 3000);
    }
  };
  
  // اعمال تنظیمات ظاهری (تم و اندازه متن)
  const applyAppearanceSettings = () => {
    try {
      // اعمال تم
      const root = document.documentElement;
      
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else if (theme === 'system') {
        // برای حالت سیستم از media query استفاده می‌کنیم
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
      
      // اعمال اندازه متن
      root.style.setProperty('--font-size-base', `${fontSize}px`);
    } catch (error) {
      console.error('خطا در اعمال تنظیمات ظاهری:', error);
    }
  };
  
  // اعمال تنظیمات ظاهری هنگام بارگذاری
  useEffect(() => {
    applyAppearanceSettings();
  }, [theme, fontSize]);

  const isSettingDisabled = (setting: Setting): boolean => {
    if (!setting.dependsOn) return false;
    
    // بررسی وابستگی
    let parentValue: any = null;
    
    // جستجوی مقدار والد در تنظیمات
    settings.forEach(group => {
      group.settings.forEach(s => {
        if (s.id === setting.dependsOn?.id) {
          parentValue = s.value;
        }
        
        if (s.children) {
          s.children.forEach(child => {
            if (child.id === setting.dependsOn?.id) {
              parentValue = child.value;
            }
          });
        }
      });
    });
    
    return parentValue !== setting.dependsOn.value;
  };

  const renderSetting = (setting: Setting, groupIndex: number, settingIndex: number, childIndex?: number) => {
    const disabled = setting.disabled || isSettingDisabled(setting);
    
    switch (setting.type) {
      case 'text':
        return (
          <div>
            <input
              type="text"
              value={setting.value}
              onChange={(e) => handleChange(groupIndex, settingIndex, e.target.value, childIndex)}
              className={`input mt-1 w-full ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={disabled}
            />
            {setting.description && (
              <p className="text-xs text-gray-500 mt-1 text-right">{setting.description}</p>
            )}
          </div>
        );
      
      case 'select':
        return (
          <div>
            <select
              value={setting.value}
              onChange={(e) => handleChange(groupIndex, settingIndex, e.target.value, childIndex)}
              className={`input mt-1 w-full ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={disabled}
            >
              {setting.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {setting.description && (
              <p className="text-xs text-gray-500 mt-1 text-right">{setting.description}</p>
            )}
          </div>
        );
      
      case 'toggle':
        return (
          <div>
            <Switch
              checked={setting.value}
              onChange={(checked) => handleChange(groupIndex, settingIndex, checked, childIndex)}
              className={`${
                setting.value ? 'bg-primary' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={disabled}
            >
              <span className="sr-only">{setting.label}</span>
              <span
                className={`${
                  setting.value ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
            {setting.description && (
              <p className="text-xs text-gray-500 mt-1 text-right">{setting.description}</p>
            )}
          </div>
        );
      
      case 'range':
        return (
          <div className="mt-1">
            <input
              type="range"
              min={setting.min}
              max={setting.max}
              step={setting.step}
              value={setting.value}
              onChange={(e) => handleChange(groupIndex, settingIndex, Number(e.target.value), childIndex)}
              className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={disabled}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{setting.min}</span>
              <span>{setting.value}</span>
              <span>{setting.max}</span>
            </div>
            {setting.description && (
              <p className="text-xs text-gray-500 mt-1 text-right">{setting.description}</p>
            )}
          </div>
        );
      
      case 'group':
        return (
          <div className="mt-4 space-y-4 border-r border-gray-200 pr-4">
            {setting.children?.map((childSetting, idx) => (
              <div key={childSetting.id} className="flex flex-col sm:flex-row sm:items-center justify-between pt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-0 text-right">
                  {childSetting.label}
                </label>
                <div className="w-full sm:w-64">
                  {renderSetting(childSetting, groupIndex, settingIndex, idx)}
                </div>
              </div>
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-auto flex flex-col items-center p-2 sm:p-4 md:p-6 lg:p-8 text-right">
      <div className="w-full max-w-3xl">
        <div className="sticky top-0 bg-white z-10 py-2 mb-4 border-b">
          <h1 className="text-2xl font-bold">تنظیمات برنامه</h1>
        </div>
        
        {/* تب‌ها */}
        <div className="bg-white rounded-lg shadow-md mb-4">
          <div className="flex flex-wrap border-b">
            <button 
              className={`px-4 py-3 font-medium flex items-center ${activeTab === 'personal' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('personal')}
            >
              <UserIcon className="w-5 h-5 ml-2" />
              تنظیمات شخصی
            </button>
            <button 
              className={`px-4 py-3 font-medium flex items-center ${activeTab === 'appearance' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('appearance')}
            >
              <SunIcon className="w-5 h-5 ml-2" />
              ظاهر برنامه
            </button>
            <button 
              className={`px-4 py-3 font-medium flex items-center ${activeTab === 'voice' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('voice')}
            >
              <SpeakerWaveIcon className="w-5 h-5 ml-2" />
              صدا و گفتار
            </button>
            <button 
              className={`px-4 py-3 font-medium flex items-center ${activeTab === 'api' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('api')}
            >
              <DocumentTextIcon className="w-5 h-5 ml-2" />
              آمار API
            </button>
            <button 
              className={`px-4 py-3 font-medium flex items-center ${activeTab === 'advanced' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('advanced')}
            >
              <CogIcon className="w-5 h-5 ml-2" />
              پیشرفته
            </button>
          </div>
        </div>
        
        <div className="space-y-8">
          {/* تنظیمات شخصی */}
          {activeTab === 'personal' && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4">تنظیمات شخصی</h2>
              <div className="space-y-6">
                {settings[0].settings.map((setting, settingIndex) => 
                  renderSetting(setting, 0, settingIndex)
                )}
              </div>
            </div>
          )}
          
          {/* تنظیمات ظاهری */}
          {activeTab === 'appearance' && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4">ظاهر برنامه</h2>
              
              <div className="space-y-6">
                <div className="flex flex-col">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-0">
                      حالت نمایش
                    </label>
                    <div className="w-full sm:w-64 flex space-x-2 space-x-reverse">
                      <button 
                        className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center space-x-2 space-x-reverse ${theme === 'light' ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}
                        onClick={() => {
                          setTheme('light');
                          // ذخیره خودکار تنظیمات هنگام تغییر تم
                          const settingsValues = JSON.parse(localStorage.getItem('hooshi_settings') || '{}');
                          settingsValues.theme = 'light';
                          localStorage.setItem('hooshi_settings', JSON.stringify(settingsValues));
                          // ذخیره در IndexedDB
                          dbService.saveSettings(settingsValues);
                          // نمایش نشانگر ذخیره تغییرات
                          setSaveIndicator(true);
                          setTimeout(() => setSaveIndicator(false), 2000);
                        }}
                      >
                        <SunIcon className="w-5 h-5 ml-1" />
                        <span>روشن</span>
                      </button>
                      <button 
                        className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center space-x-2 space-x-reverse ${theme === 'dark' ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}
                        onClick={() => {
                          setTheme('dark');
                          // ذخیره خودکار تنظیمات هنگام تغییر تم
                          const settingsValues = JSON.parse(localStorage.getItem('hooshi_settings') || '{}');
                          settingsValues.theme = 'dark';
                          localStorage.setItem('hooshi_settings', JSON.stringify(settingsValues));
                          // ذخیره در IndexedDB
                          dbService.saveSettings(settingsValues);
                          // نمایش نشانگر ذخیره تغییرات
                          setSaveIndicator(true);
                          setTimeout(() => setSaveIndicator(false), 2000);
                        }}
                      >
                        <MoonIcon className="w-5 h-5 ml-1" />
                        <span>تیره</span>
                      </button>
                      <button 
                        className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center ${theme === 'system' ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}
                        onClick={() => {
                          setTheme('system');
                          // ذخیره خودکار تنظیمات هنگام تغییر تم
                          const settingsValues = JSON.parse(localStorage.getItem('hooshi_settings') || '{}');
                          settingsValues.theme = 'system';
                          localStorage.setItem('hooshi_settings', JSON.stringify(settingsValues));
                          // ذخیره در IndexedDB
                          dbService.saveSettings(settingsValues);
                          // نمایش نشانگر ذخیره تغییرات
                          setSaveIndicator(true);
                          setTimeout(() => setSaveIndicator(false), 2000);
                        }}
                      >
                        <span>سیستم</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-0">
                      اندازه متن: {fontSize}px
                    </label>
                    <div className="w-full sm:w-64">
                      <input
                        type="range"
                        min="12"
                        max="20"
                        step="1"
                        value={fontSize}
                        onChange={(e) => {
                          const newSize = Number(e.target.value);
                          setFontSize(newSize);
                          // ذخیره خودکار تنظیمات هنگام تغییر اندازه فونت
                          const settingsValues = JSON.parse(localStorage.getItem('hooshi_settings') || '{}');
                          settingsValues.fontSize = newSize;
                          localStorage.setItem('hooshi_settings', JSON.stringify(settingsValues));
                          // ذخیره در IndexedDB
                          dbService.saveSettings(settingsValues);
                          // نمایش نشانگر ذخیره تغییرات
                          setSaveIndicator(true);
                          setTimeout(() => setSaveIndicator(false), 2000);
                        }}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>کوچک</span>
                        <span>متوسط</span>
                        <span>بزرگ</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* سایر تنظیمات ظاهری */}
                {settings.find(g => g.title === 'تنظیمات ظاهری')?.settings.map((setting, settingIndex) => {
                  // فیلتر کردن تنظیماتی که قبلاً اضافه کرده‌ایم
                  if (setting.id !== 'theme' && setting.id !== 'fontSize') {
                    const groupIndex = settings.findIndex(g => g.title === 'تنظیمات ظاهری');
                    return renderSetting(setting, groupIndex, settingIndex);
                  }
                  return null;
                })}
              </div>
            </div>
          )}
          
          {/* تنظیمات صدا و گفتار */}
          {activeTab === 'voice' && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4">تنظیمات صدا و گفتار</h2>
              <div className="space-y-6">
                {settings.find(g => g.title === 'تنظیمات صدا و گفتار')?.settings.map((setting, settingIndex) => {
                  const groupIndex = settings.findIndex(g => g.title === 'تنظیمات صدا و گفتار');
                  return renderSetting(setting, groupIndex, settingIndex);
                })}
                
                <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-md">
                  <p className="mb-2">
                    <strong>راهنما:</strong> استفاده از API اوپن‌ای برای صدا و گفتار کیفیت بالاتری دارد اما هزینه اضافی دارد.
                  </p>
                  <ul className="list-disc mr-5 space-y-1">
                    <li>Whisper API: تشخیص گفتار با دقت بالا در انواع لهجه‌های فارسی</li>
                    <li>TTS API: تبدیل متن به گفتار طبیعی با صداهای مختلف</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {/* آمار API */}
          {activeTab === 'api' && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <DocumentTextIcon className="w-6 h-6 ml-2" />
                آمار مصرف API
              </h2>
              
              <div className="mb-4 flex flex-wrap gap-2">
                <select
                  value={apiTimeRange}
                  onChange={(e) => setApiTimeRange(e.target.value)}
                  className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="7">7 روز گذشته</option>
                  <option value="30">30 روز گذشته</option>
                  <option value="90">90 روز گذشته</option>
                  <option value="365">1 سال گذشته</option>
                </select>
                
                <button
                  onClick={cleanupOldApiRecords}
                  className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  پاکسازی سوابق قدیمی
                </button>
              </div>
              
              {isLoadingApiStats ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : apiUsage ? (
                <div className="space-y-6">
                  {/* خلاصه کلی */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2 text-blue-700">
                        هزینه کل
                      </h3>
                      <p className="text-3xl font-bold text-blue-700">{formatCost(apiUsage.total_cost || 0)}</p>
                      <p className="text-sm text-blue-600">
                        تعداد درخواست‌ها: {(apiUsage.total_requests || 0).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2 text-green-700">
                        توکن‌های متنی
                      </h3>
                      <p className="text-3xl font-bold text-green-700">{(apiUsage.total_tokens || 0).toLocaleString()}</p>
                      <p className="text-sm text-green-600">
                        ورودی: {(apiUsage.prompt_tokens || 0).toLocaleString()} | 
                        خروجی: {(apiUsage.completion_tokens || 0).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2 text-purple-700">
                        صدا و گفتار
                      </h3>
                      <p className="text-3xl font-bold text-purple-700">
                        {Math.round(apiUsage.audio_seconds || 0).toLocaleString()} ثانیه
                      </p>
                      <p className="text-sm text-purple-600">
                        کاراکترهای TTS: {(apiUsage.tts_chars || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {/* جزئیات مدل‌ها */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">هزینه به تفکیک مدل</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white border">
                        <thead>
                          <tr className="bg-gray-100 border-b">
                            <th className="py-2 px-4 text-right">مدل</th>
                            <th className="py-2 px-4 text-right">تعداد درخواست</th>
                            <th className="py-2 px-4 text-right">تعداد توکن</th>
                            <th className="py-2 px-4 text-right">هزینه</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apiUsage.by_model && Object.entries(apiUsage.by_model).map(([model, data]: [string, any]) => (
                            <tr key={model} className="border-b hover:bg-gray-50">
                              <td className="py-2 px-4">{model}</td>
                              <td className="py-2 px-4">{(data.requests || 0).toLocaleString()}</td>
                              <td className="py-2 px-4">{(data.tokens || 0).toLocaleString()}</td>
                              <td className="py-2 px-4">{formatCost(data.cost || 0)}</td>
                            </tr>
                          ))}
                          {(!apiUsage.by_model || Object.keys(apiUsage.by_model).length === 0) && (
                            <tr className="border-b">
                              <td colSpan={4} className="py-4 px-4 text-center text-gray-500">
                                آماری برای مدل‌ها وجود ندارد
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 text-gray-500">
                  آماری برای نمایش وجود ندارد. اطلاعات مصرف API پس از ارسال درخواست ثبت خواهد شد.
                </div>
              )}
            </div>
          )}
          
          {/* تنظیمات پیشرفته */}
          {activeTab === 'advanced' && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-xl font-semibold mb-4">تنظیمات پیشرفته</h2>
              <div className="space-y-6">
                {settings.find(g => g.title === 'تنظیمات پیشرفته')?.settings.map((setting, settingIndex) => {
                  const groupIndex = settings.findIndex(g => g.title === 'تنظیمات پیشرفته');
                  return renderSetting(setting, groupIndex, settingIndex);
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* دکمه ذخیره تنظیمات */}
        <div className="sticky bottom-4 flex justify-center mt-8">
          <button
            onClick={saveSettings}
            className={`px-6 py-3 rounded-lg text-white font-medium flex items-center ${
              saveIndicator ? 'bg-green-500' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {saveIndicator ? (
              <>
                <CheckIcon className="h-5 w-5 ml-2" />
                ذخیره شد
              </>
            ) : (
              <>
                ذخیره تنظیمات
              </>
            )}
          </button>
        </div>
        
        {/* پیام خطا */}
        {saveError && (
          <div className="fixed bottom-4 left-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
            {saveError}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage; 