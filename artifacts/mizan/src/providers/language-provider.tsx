import React, { createContext, useContext, useEffect } from "react";

type Language = "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (_language: Language) => void;
  t: (key: string) => string;
  dir: "ltr";
}

const translations: Record<string, string> = {
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
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.dir = "ltr";
    document.documentElement.lang = "en";
    localStorage.setItem("mizan-lang", "en");
  }, []);

  return (
    <LanguageContext.Provider
      value={{
        language: "en",
        setLanguage: () => undefined,
        t: (key) => translations[key] || key,
        dir: "ltr",
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};