export interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  size: number;
  bedrooms: number;
  bathrooms: number;
  year: number;
  floor: number;
  features: string[];
  description: string;
  images: string[];
  latitude: number;
  longitude: number;
}

export const properties: Property[] = [
  {
    id: "prop1",
    title: "آپارتمان لوکس با نمای پانوراما",
    location: "نیاوران، خیابان باهنر",
    price: 4800000000, // 4.8 میلیارد تومان
    size: 95,
    bedrooms: 2,
    bathrooms: 1,
    year: 1401,
    floor: 4,
    features: [
      "پارکینگ",
      "آسانسور",
      "انباری",
      "لابی مجلل",
      "سیستم گرمایش از کف",
      "کابینت های‌گلاس"
    ],
    description: "این آپارتمان طبقه ۴ یک برج ۶ طبقه در خیابان باهنر است. طراحی داخلی مدرن با متریال‌های درجه یک. آشپزخانه اپن با کابینت‌های های‌گلاس سفید. این منطقه ۱۲٪ رشد قیمت سالانه داشته که بالاتر از میانگین تهرانه.",
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
      "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
    ],
    latitude: 35.798639,
    longitude: 51.439241
  },
  {
    id: "prop2",
    title: "آپارتمان دوبلکس با تراس اختصاصی",
    location: "دروس، بلوار شهرزاد",
    price: 5200000000, // 5.2 میلیارد تومان
    size: 110,
    bedrooms: 2,
    bathrooms: 2,
    year: 1400,
    floor: 5,
    features: [
      "پارکینگ (۲ عدد)",
      "آسانسور",
      "انباری",
      "استخر و سونا",
      "سالن ورزش",
      "روف گاردن مشترک"
    ],
    description: "آپارتمان دوبلکس با معماری مدرن و دو طبقه با پله داخلی. طبقه اول شامل پذیرایی بزرگ و آشپزخانه اپن، و طبقه دوم شامل اتاق خواب‌ها و تراس بزرگ اختصاصی با چشم‌انداز عالی به شهر. ساختمان دارای امکانات رفاهی کامل است.",
    images: [
      "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
      "https://images.unsplash.com/photo-1600607687644-c7a23e929dd9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
    ],
    latitude: 35.789232,
    longitude: 51.455289
  },
  {
    id: "prop3",
    title: "آپارتمان لوکس با حیاط اختصاصی",
    location: "نیاوران، خیابان جماران",
    price: 4900000000, // 4.9 میلیارد تومان
    size: 105,
    bedrooms: 2,
    bathrooms: 2,
    year: 1402,
    floor: 1,
    features: [
      "پارکینگ",
      "آسانسور",
      "انباری",
      "حیاط اختصاصی",
      "سیستم هوشمند خانه",
      "روف گاردن"
    ],
    description: "این آپارتمان طبقه اول با حیاط اختصاصی ۵۰ متری، ترکیبی از آرامش و لوکس بودن را به شما هدیه می‌دهد. هر دو اتاق خواب دارای سرویس بهداشتی مستر هستند. سیستم هوشمند کنترل روشنایی، دما و پرده‌ها از طریق موبایل قابل کنترل است.",
    images: [
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
      "https://images.unsplash.com/photo-1600566752355-35792bedcfea?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
      "https://images.unsplash.com/photo-1600121848594-d8644e57abab?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
    ],
    latitude: 35.803527,
    longitude: 51.447884
  },
  {
    id: "prop4",
    title: "پنت‌هاوس با چشم‌انداز ۳۶۰ درجه به تهران",
    location: "فرمانیه، خیابان فرشته",
    price: 15000000000, // 15 میلیارد تومان
    size: 220,
    bedrooms: 3,
    bathrooms: 3,
    year: 1401,
    floor: 12,
    features: [
      "پارکینگ (۳ عدد)",
      "آسانسور اختصاصی",
      "انباری بزرگ",
      "استخر خصوصی روی بام",
      "سالن بدنسازی اختصاصی",
      "سیستم امنیتی پیشرفته"
    ],
    description: "پنت‌هاوس لوکس در بالاترین طبقه برج مجلل فرشته با آسانسور اختصاصی و چشم‌انداز خیره‌کننده به تمام تهران. فضای داخلی باشکوه با سقف‌های بلند، پنجره‌های قدی و طراحی معماری بی‌نظیر. این ملک منحصر به فرد سبک زندگی ایده‌آل را برای افرادی که به دنبال تجربه زندگی در بالاترین سطح لوکس هستند، فراهم می‌کند.",
    images: [
      "https://images.unsplash.com/photo-1591088398332-8a7791972843?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1074&q=80",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1074&q=80",
      "https://images.unsplash.com/photo-1604014237800-1c9102c219da?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
    ],
    latitude: 35.791654,
    longitude: 51.464342
  },
  {
    id: "prop5",
    title: "ویلا دوبلکس مدرن در شهرک غرب",
    location: "شهرک غرب، فاز ۶، خیابان گلستان",
    price: 8500000000, // 8.5 میلیارد تومان
    size: 300,
    bedrooms: 4,
    bathrooms: 3,
    year: 1399,
    floor: 0,
    features: [
      "پارکینگ (۴ عدد)",
      "حیاط بزرگ",
      "استخر سرپوشیده",
      "آشپزخانه جزیره‌ای",
      "فضای BBQ",
      "اتاق سینما خانگی"
    ],
    description: "این ویلای دوبلکس مدرن با معماری منحصر به فرد در بهترین موقعیت شهرک غرب قرار دارد. فضای داخلی وسیع و پر نور با سقف‌های بلند و پنجره‌های بزرگ. سیستم هوشمند کنترل خانه، گرمایش از کف و سرمایش مرکزی. حیاط بزرگ با فضای سبز طراحی شده و استخر سرپوشیده با سونا و جکوزی.",
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
      "https://images.unsplash.com/photo-1576941089067-2de3c901e126?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1278&q=80"
    ],
    latitude: 35.763573,
    longitude: 51.361939
  }
]; 