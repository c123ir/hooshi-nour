import React from 'react';

const AboutPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4 rtl">
      <h1 className="text-2xl font-bold mb-6">درباره هوشی</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">معرفی هوشی</h2>
        <p className="mb-4">
          هوشی (Hooshi) یک دستیار هوشمند مبتنی بر هوش مصنوعی است که برای کمک به مشاوران املاک و مشتریان در زمینه خرید، فروش، اجاره و رهن ملک طراحی شده است.
        </p>
        <p className="mb-4">
          این دستیار هوشمند با استفاده از فناوری‌های پیشرفته پردازش زبان طبیعی، قادر است به سوالات شما در مورد قیمت‌ها، ویژگی‌های مناطق مختلف، قوانین ملکی و موارد دیگر پاسخ دهد.
        </p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">ویژگی‌های هوشی</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>پاسخگویی به سوالات در مورد خرید، فروش، اجاره و رهن ملک</li>
          <li>ارائه اطلاعات در مورد مناطق و محله‌های مختلف</li>
          <li>تخمین قیمت ملک بر اساس ویژگی‌ها و موقعیت</li>
          <li>راهنمایی در مورد مراحل قانونی معاملات ملکی</li>
          <li>پشتیبانی از گفتگوی صوتی و تایپی</li>
          <li>امکان ذخیره‌سازی و مدیریت گفتگوها</li>
        </ul>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">تیم توسعه</h2>
        <p className="mb-4">
          هوشی توسط مجتبی حسنی و تیم با استعداد او در سال ۱۴۰۳ توسعه یافته است. هدف ما ایجاد ابزاری کاربردی و هوشمند برای تسهیل فرآیند معاملات ملکی و کمک به مشاوران املاک و مشتریان است.
        </p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">تکنولوژی‌ها</h2>
        <p className="mb-4">
          هوشی با استفاده از فناوری‌های زیر توسعه یافته است:
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>React و TypeScript برای رابط کاربری</li>
          <li>OpenAI API برای پردازش زبان طبیعی و هوش مصنوعی</li>
          <li>IndexedDB برای ذخیره‌سازی داده‌ها در مرورگر</li>
          <li>TailwindCSS برای طراحی رابط کاربری</li>
          <li>Web Speech API و OpenAI Audio API برای پشتیبانی از قابلیت‌های صوتی</li>
        </ul>
      </div>
      
      <div className="mt-8 text-center text-gray-500 dark:text-gray-400">
        <p>نسخه ۱.۰.۰ - تمامی حقوق محفوظ است &copy; ۱۴۰۳</p>
      </div>
    </div>
  );
};

export default AboutPage; 