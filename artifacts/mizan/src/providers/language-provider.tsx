import React, { createContext, useContext, useEffect, useState } from 'react';
import { getGetProfileQueryKey, useGetProfile } from '@workspace/api-client-react';
import { useAuth } from '@/providers/auth-provider';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    bills: "Bills",
    debts: "Debts",
    savings: "Savings",
    settings: "Settings",
    welcome_back: "Welcome back",
    financial_overview: "Here is your financial overview",
    monthly_income: "Monthly Income",
    upcoming_bills: "Upcoming Bills",
    total_debt: "Total Remaining Debt",
    current_savings: "Total Savings",
    recent_activity: "Recent Activity",
    no_activity: "No recent activity found.",
    add_bill: "Add Bill",
    add_debt: "Add Debt",
    add_savings: "Add Goal",
    amount: "Amount",
    due_date: "Due Date",
    name: "Name",
    frequency: "Frequency",
    paid: "Paid",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    status: "Status",
    overdue: "Overdue",
    pending: "Pending",
    monthly: "Monthly",
    yearly: "Yearly",
    weekly: "Weekly",
    one_time: "One-time",
    pay_now: "Pay Now",
    mark_paid: "Mark Paid",
    mark_unpaid: "Mark Unpaid",
    total_amount: "Total Amount",
    remaining_amount: "Remaining",
    monthly_payment: "Monthly Payment",
    contribute: "Contribute",
    target_amount: "Target Amount",
    target_date: "Target Date",
    profile: "Profile",
    preferences: "Preferences",
    language: "Language",
    theme: "Theme",
    currency: "Preferred Currency",
    logout: "Log out",
    assistant: "Financial Assistant",
    assistant_greeting: "How can I help you manage your finances today?",
    ask_assistant: "Ask Assistant",
    type_question: "Type your question...",
    starter_bills: "What are my upcoming bills?",
    starter_debt: "How much debt do I have left?",
    starter_savings: "What is my current savings progress?",
    error_asking: "Sorry, I couldn't process that. Try again.",
  },
  ar: {
    dashboard: "لوحة القيادة",
    bills: "الفواتير",
    debts: "الديون",
    savings: "المدخرات",
    settings: "الإعدادات",
    welcome_back: "مرحباً بعودتك",
    financial_overview: "إليك نظرة عامة على أموالك",
    monthly_income: "الدخل الشهري",
    upcoming_bills: "الفواتير القادمة",
    total_debt: "إجمالي الدين المتبقي",
    current_savings: "إجمالي المدخرات",
    recent_activity: "النشاط الأخير",
    no_activity: "لا يوجد نشاط أخير.",
    add_bill: "إضافة فاتورة",
    add_debt: "إضافة دين",
    add_savings: "إضافة هدف",
    amount: "المبلغ",
    due_date: "تاريخ الاستحقاق",
    name: "الاسم",
    frequency: "التكرار",
    paid: "مدفوع",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    edit: "تعديل",
    status: "الحالة",
    overdue: "متأخر",
    pending: "قيد الانتظار",
    monthly: "شهري",
    yearly: "سنوي",
    weekly: "أسبوعي",
    one_time: "مرة واحدة",
    pay_now: "ادفع الآن",
    mark_paid: "تحديد كمدفوع",
    mark_unpaid: "تحديد كغير مدفوع",
    total_amount: "المبلغ الإجمالي",
    remaining_amount: "المتبقي",
    monthly_payment: "الدفعة الشهرية",
    contribute: "المساهمة",
    target_amount: "المبلغ المستهدف",
    target_date: "التاريخ المستهدف",
    profile: "الملف الشخصي",
    preferences: "التفضيلات",
    language: "اللغة",
    theme: "المظهر",
    currency: "العملة المفضلة",
    logout: "تسجيل الخروج",
    assistant: "المساعد المالي",
    assistant_greeting: "كيف يمكنني مساعدتك في إدارة أموالك اليوم؟",
    ask_assistant: "اسأل المساعد",
    type_question: "اكتب سؤالك...",
    starter_bills: "ما هي الفواتير القادمة؟",
    starter_debt: "كم يتبقى من الديون؟",
    starter_savings: "ما هو تقدم مدخراتي الحالي؟",
    error_asking: "عذراً، لم أتمكن من معالجة ذلك. حاول مرة أخرى.",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(
    (localStorage.getItem('mizan-lang') as Language) || 'en'
  );
  const { user } = useAuth();
  const { data: profile } = useGetProfile({
    query: { enabled: !!user, queryKey: getGetProfileQueryKey() },
  });

  useEffect(() => {
    if (profile?.language && (profile.language === 'en' || profile.language === 'ar')) {
      setLanguage(profile.language as Language);
    }
  }, [profile?.language]);

  useEffect(() => {
    const dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    localStorage.setItem('mizan-lang', language);
  }, [language]);

  const t = (key: string) => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir: language === 'ar' ? 'rtl' : 'ltr' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};