import { useState, useEffect } from 'react';
import { useGetProfile, useUpdateProfile, getGetProfileQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLanguage } from '@/providers/language-provider';
import { useTheme } from '@/providers/theme-provider';

export default function Settings() {
  const { t, setLanguage: setContextLang } = useLanguage();
  const { setTheme: setContextTheme } = useTheme();
  const { data: profile, isLoading } = useGetProfile();
  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    monthlyIncome: 0,
    preferredCurrency: "USD",
    language: "en",
    theme: "system"
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        monthlyIncome: profile.monthlyIncome,
        preferredCurrency: profile.preferredCurrency || "USD",
        language: profile.language || "en",
        theme: profile.theme || "system"
      });
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({ data: formData }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
        toast.success("Preferences updated successfully");
        if (formData.language === 'en' || formData.language === 'ar') {
          setContextLang(formData.language as 'en' | 'ar');
        }
        if (formData.theme) {
          setContextTheme(formData.theme as any);
        }
      }
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <header>
        <h1 className="text-3xl font-serif font-bold text-foreground">{t('settings')}</h1>
        <p className="text-muted-foreground mt-1 text-lg">Customize your financial space.</p>
      </header>

      <form onSubmit={handleSubmit}>
        <Card className="rounded-3xl shadow-sm overflow-hidden">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-base">{t('monthly_income')}</Label>
              <Input 
                type="number" 
                step="0.01" 
                className="h-12 text-lg"
                value={formData.monthlyIncome} 
                onChange={e => setFormData({ ...formData, monthlyIncome: Number(e.target.value) })}
              />
              <p className="text-sm text-muted-foreground">Used to calculate dashboard insights.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-base">{t('currency')}</Label>
              <Select value={formData.preferredCurrency} onValueChange={v => setFormData({ ...formData, preferredCurrency: v })}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="AED">AED (د.إ)</SelectItem>
                  <SelectItem value="SAR">SAR (د.إ)</SelectItem>
                  <SelectItem value="EGP">EGP (ج.م)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base">{t('language')}</Label>
              <Select value={formData.language} onValueChange={v => setFormData({ ...formData, language: v })}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base">{t('theme')}</Label>
              <Select value={formData.theme} onValueChange={v => setFormData({ ...formData, theme: v })}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4">
              <Button type="submit" size="lg" className="w-full sm:w-auto rounded-full px-8" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? 'Saving...' : t('save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}