import React, { useState, useEffect } from 'react';
import dbService from '../services/db';
import { ApiUsageRecord, ApiUsageSummary } from '../services/db';
import { CalendarDaysIcon, ArrowsRightLeftIcon, CurrencyDollarIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ModelUsage {
  model: string;
  requests: number;
  tokens: number;
  cost: number;
}

interface DateUsage {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
}

const UsageDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<ApiUsageSummary | null>(null);
  const [recentRecords, setRecentRecords] = useState<ApiUsageRecord[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 روز قبل
    endDate: new Date()
  });
  const [modelUsage, setModelUsage] = useState<ModelUsage[]>([]);
  const [dateUsage, setDateUsage] = useState<DateUsage[]>([]);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // دریافت خلاصه مصرف
      const summaryData = await dbService.getApiUsageSummary(dateRange.startDate, dateRange.endDate);
      setSummary(summaryData);
      
      // دریافت آخرین رکوردها
      const records = await dbService.getApiUsageHistory(20, 0);
      setRecentRecords(records);
      
      // پردازش داده‌ها برای نمودارها
      processUsageData(summaryData);
    } catch (error) {
      console.error('خطا در بارگیری داده‌های مصرف API:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const processUsageData = (data: ApiUsageSummary) => {
    // پردازش مصرف بر اساس مدل
    const modelData: ModelUsage[] = Object.entries(data.by_model).map(([model, usage]) => ({
      model,
      requests: usage.requests,
      tokens: usage.tokens,
      cost: usage.cost
    }));
    setModelUsage(modelData.sort((a, b) => b.tokens - a.tokens));
    
    // پردازش مصرف بر اساس تاریخ
    const dateData: DateUsage[] = Object.entries(data.by_date).map(([date, usage]) => ({
      date,
      requests: usage.requests,
      tokens: usage.tokens,
      cost: usage.cost
    }));
    setDateUsage(dateData.sort((a, b) => a.date.localeCompare(b.date)));
  };
  
  const formatCost = (cost: number): string => {
    return `$${cost.toFixed(4)}`;
  };
  
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fa-IR').format(date);
  };
  
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('fa-IR').format(num);
  };
  
  const getEndpointIcon = (endpoint: string) => {
    switch(endpoint) {
      case 'chat':
        return <span className="text-green-500">💬</span>;
      case 'whisper':
        return <span className="text-purple-500">🎤</span>;
      case 'tts':
        return <span className="text-blue-500">🔊</span>;
      default:
        return <span className="text-gray-500">🔄</span>;
    }
  };
  
  const getStatusIcon = (response_type: string, error?: string) => {
    if (error) {
      return <ExclamationTriangleIcon className="text-red-500 h-5 w-5" />;
    }
    if (response_type === 'error') {
      return <ExclamationTriangleIcon className="text-red-500 h-5 w-5" />;
    }
    return <CheckIcon className="text-green-500 h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 rtl">
      <h1 className="text-2xl font-bold mb-6">داشبورد مصرف API</h1>
      
      {/* کارت‌های خلاصه */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
              <ArrowsRightLeftIcon className="text-blue-500 dark:text-blue-300 h-6 w-6" />
            </div>
            <div className="mr-4">
              <h2 className="text-gray-600 dark:text-gray-400 text-sm">تعداد درخواست‌ها</h2>
              <p className="text-2xl font-bold">{summary ? formatNumber(summary.total_requests) : 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <div className="mr-4">
              <h2 className="text-gray-600 dark:text-gray-400 text-sm">مجموع توکن‌ها</h2>
              <p className="text-2xl font-bold">{summary ? formatNumber(summary.total_tokens) : 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500 dark:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 117.072 0m-9.9-2.828a9 9 0 1112.728 0" />
              </svg>
            </div>
            <div className="mr-4">
              <h2 className="text-gray-600 dark:text-gray-400 text-sm">زمان صوت (ثانیه)</h2>
              <p className="text-2xl font-bold">{summary ? formatNumber(Math.round(summary.audio_seconds)) : 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-full">
              <CurrencyDollarIcon className="text-yellow-500 dark:text-yellow-300 h-6 w-6" />
            </div>
            <div className="mr-4">
              <h2 className="text-gray-600 dark:text-gray-400 text-sm">هزینه تخمینی</h2>
              <p className="text-2xl font-bold">{summary ? formatCost(summary.total_cost) : '$0.00'}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* جدول آخرین درخواست‌ها */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">آخرین درخواست‌ها</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">زمان</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">سرویس</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">مدل</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">نوع درخواست</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">توکن‌ها</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">هزینه</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">وضعیت</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">جزئیات</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {recentRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {formatDate(record.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center">
                      {getEndpointIcon(record.endpoint)}
                      <span className="mr-2">{record.endpoint}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {record.model}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {record.request_type} → {record.response_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {formatNumber(record.total_tokens)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {formatCost(record.cost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getStatusIcon(record.response_type, record.error)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <button 
                      className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      title={record.notes || 'بدون توضیحات'}
                    >
                      جزئیات
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* نمودارها و آمار */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* مصرف بر اساس مدل */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">مصرف بر اساس مدل</h2>
          </div>
          <div className="p-4">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">مدل</th>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">درخواست‌ها</th>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">توکن‌ها</th>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">هزینه</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {modelUsage.map((usage, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {usage.model}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatNumber(usage.requests)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatNumber(usage.tokens)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatCost(usage.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* مصرف روزانه */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">مصرف روزانه</h2>
          </div>
          <div className="p-4">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">تاریخ</th>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">درخواست‌ها</th>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">توکن‌ها</th>
                  <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">هزینه</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {dateUsage.map((usage, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(usage.date)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatNumber(usage.requests)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatNumber(usage.tokens)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatCost(usage.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageDashboard; 