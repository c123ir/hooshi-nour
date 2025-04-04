export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: string;
}

export const sampleConversations: Conversation[] = [
  {
    id: "conv1",
    title: "جستجوی آپارتمان در نیاوران",
    lastUpdated: "2023-07-10T14:30:00",
    messages: [
      {
        id: "msg1",
        role: "user",
        content: "سلام، دنبال یه آپارتمان تو شمال تهران هستم، حدود ۱۰۰ متر",
        timestamp: "2023-07-10T14:30:00"
      },
      {
        id: "msg2",
        role: "assistant",
        content: "سلام! خوش آمدید. در محدوده شمال تهران دنبال خرید هستید یا اجاره؟",
        timestamp: "2023-07-10T14:30:30"
      },
      {
        id: "msg3",
        role: "user",
        content: "خرید",
        timestamp: "2023-07-10T14:31:00"
      },
      {
        id: "msg4",
        role: "assistant",
        content: "متوجه شدم. چه محدوده قیمتی مد نظرتونه؟",
        timestamp: "2023-07-10T14:31:30"
      },
      {
        id: "msg5",
        role: "user",
        content: "تا ۵ میلیارد",
        timestamp: "2023-07-10T14:32:00"
      },
      {
        id: "msg6",
        role: "assistant",
        content: "با بودجه ۵ میلیارد برای حدود ۱۰۰ متر در شمال تهران، گزینه‌های خوبی داریم. می‌تونید محدوده دقیق‌تری رو مشخص کنید؟ مثلاً فرمانیه، نیاوران، قیطریه؟",
        timestamp: "2023-07-10T14:32:30"
      },
      {
        id: "msg7",
        role: "user",
        content: "نیاوران و دروس",
        timestamp: "2023-07-10T14:33:00"
      },
      {
        id: "msg8",
        role: "assistant",
        content: "عالیه! چه امکاناتی برای شما ضروری هستند؟ مثلاً پارکینگ، انباری، آسانسور...",
        timestamp: "2023-07-10T14:33:30"
      },
      {
        id: "msg9",
        role: "user",
        content: "پارکینگ حتماً باشه، آسانسور هم لازمه. ترجیحاً نوساز باشه.",
        timestamp: "2023-07-10T14:34:00"
      },
      {
        id: "msg10",
        role: "assistant",
        content: "عالیه! و چند خوابه می‌خواید؟",
        timestamp: "2023-07-10T14:34:30"
      },
      {
        id: "msg11",
        role: "user",
        content: "دو خواب",
        timestamp: "2023-07-10T14:35:00"
      },
      {
        id: "msg12",
        role: "assistant",
        content: "من ۱۱ مورد پیدا کردم که با شرایط شما مطابقت دارند. ۳ مورد به طور خاص به نظرم برای شما مناسب هستند. اگر مایل هستید می‌توانم اطلاعات کامل آنها را نشان دهم.",
        timestamp: "2023-07-10T14:35:30"
      }
    ]
  },
  {
    id: "conv2",
    title: "فروش آپارتمان در سعادت آباد",
    lastUpdated: "2023-07-09T10:15:00",
    messages: [
      {
        id: "msg1",
        role: "user",
        content: "می‌خوام خونه‌م رو بفروشم",
        timestamp: "2023-07-09T10:15:00"
      },
      {
        id: "msg2",
        role: "assistant",
        content: "سلام! برای فروش ملکتون کمکتون می‌کنم. اول بگید، ملک دقیقاً کجا قرار داره؟",
        timestamp: "2023-07-09T10:15:30"
      },
      {
        id: "msg3",
        role: "user",
        content: "تهران، سعادت‌آباد، خیابان سرو غربی",
        timestamp: "2023-07-09T10:16:00"
      },
      {
        id: "msg4",
        role: "assistant",
        content: "عالیه. چند متره و چند خوابه است؟",
        timestamp: "2023-07-09T10:16:30"
      },
      {
        id: "msg5",
        role: "user",
        content: "۱۳۵ متر، سه خواب",
        timestamp: "2023-07-09T10:17:00"
      },
      {
        id: "msg6",
        role: "assistant",
        content: "سال ساخت و طبقه چندمه؟",
        timestamp: "2023-07-09T10:17:30"
      },
      {
        id: "msg7",
        role: "user",
        content: "سال ۹۶، طبقه چهارم",
        timestamp: "2023-07-09T10:18:00"
      },
      {
        id: "msg8",
        role: "assistant",
        content: "می‌تونید چند تا عکس از قسمت‌های مختلف خونه بفرستید؟ مخصوصاً پذیرایی، آشپزخانه و سرویس‌ها مهم هستند.",
        timestamp: "2023-07-09T10:18:30"
      },
      {
        id: "msg9",
        role: "user",
        content: "[چند عکس آپلود کرده]",
        timestamp: "2023-07-09T10:20:00"
      },
      {
        id: "msg10",
        role: "assistant",
        content: "ممنون بابت عکس‌ها. ملک زیبایی دارید! با توجه به موقعیت، متراژ و امکانات ملکتون، براساس معاملات اخیر منطقه، قیمت منصفانه در محدوده ۷.۲ تا ۷.۸ میلیارد تومان است.",
        timestamp: "2023-07-09T10:21:00"
      }
    ]
  },
  {
    id: "conv3",
    title: "مشاوره برای خرید در منطقه ۲۲",
    lastUpdated: "2023-07-08T16:45:00",
    messages: [
      {
        id: "msg1",
        role: "user",
        content: "سلام، برای منطقه ۲۲ می‌خواستم مشاوره بگیرم",
        timestamp: "2023-07-08T16:45:00"
      },
      {
        id: "msg2",
        role: "assistant",
        content: "سلام! منطقه ۲۲ انتخاب خوبیه، مخصوصاً برای خانواده‌ها. چه نوع ملکی مد نظرتونه؟ و برای خرید میخواید یا اجاره؟",
        timestamp: "2023-07-08T16:45:30"
      },
      {
        id: "msg3",
        role: "user",
        content: "خرید آپارتمان برای سرمایه‌گذاری. فکر می‌کنم در آینده رشد خوبی داشته باشه",
        timestamp: "2023-07-08T16:46:00"
      },
      {
        id: "msg4",
        role: "assistant",
        content: "درسته، منطقه ۲۲ پتانسیل رشد خوبی داره. در حال حاضر قیمت‌ها نسبت به مناطق مرکزی شهر مناسب‌تره و با توجه به توسعه زیرساخت‌ها و دسترسی‌ها، آینده خوبی برای سرمایه‌گذاری داره. بودجه شما برای این سرمایه‌گذاری چقدره؟",
        timestamp: "2023-07-08T16:46:30"
      },
      {
        id: "msg5",
        role: "user",
        content: "حدود ۲ تا ۳ میلیارد",
        timestamp: "2023-07-08T16:47:00"
      },
      {
        id: "msg6",
        role: "assistant",
        content: "با این بودجه، گزینه‌های خوبی دارید. می‌تونید واحدهای نوساز تا حدود ۸۰-۹۰ متری رو در برج‌های جدید منطقه بررسی کنید. به نظرتون متراژ حدودی چقدر باشه؟ و ترجیح میدید در کدام محدوده منطقه ۲۲ باشه؟ مثلاً چیتگر، دریاچه خلیج فارس یا شهرک راه‌آهن؟",
        timestamp: "2023-07-08T16:47:30"
      },
      {
        id: "msg7",
        role: "user",
        content: "نزدیک دریاچه باشه بهتره. متراژ هم حدود ۸۰-۹۰ خوبه",
        timestamp: "2023-07-08T16:48:00"
      },
      {
        id: "msg8",
        role: "assistant",
        content: "عالیه! نزدیک دریاچه انتخاب هوشمندانه‌ایه. من چند مورد خاص برای شما پیدا کردم که می‌تونم نشونتون بدم. ترجیح میدید چند خوابه باشه؟",
        timestamp: "2023-07-08T16:48:30"
      }
    ]
  }
]; 