import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, User, AlertCircle, X } from 'lucide-react';
import { useLanguage } from '@/providers/language-provider';
import { useAskFinancialAssistant } from '@workspace/api-client-react';
import { Button, Input, Card, CardContent } from '@/components/ui';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function FinancialAssistantChat({ isDashboard = false, onClose }: { isDashboard?: boolean; onClose?: () => void }) {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const askMutation = useAskFinancialAssistant();

  const starters = [
    t('starter_bills'),
    t('starter_debt'),
    t('starter_savings'),
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, askMutation.isPending]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    askMutation.mutate(
      { data: { question: text.trim(), language } },
      {
        onSuccess: (data) => {
          const assistantMsg: Message = { 
            id: (Date.now() + 1).toString(), 
            role: 'assistant', 
            content: data.answer 
          };
          setMessages((prev) => [...prev, assistantMsg]);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <>
      {/* Header (Only for floating, hidden in dashboard card) */}
      {!isDashboard && (
        <div className="flex items-center justify-between p-4 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <h3 className="font-serif font-semibold">{t('assistant')}</h3>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div className={cn(
        "flex-1 p-4 overflow-y-auto flex flex-col gap-4",
        isDashboard ? "h-[400px]" : "h-[400px] max-h-[50vh]"
      )} ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 text-muted-foreground my-8">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm px-4">{t('assistant_greeting')}</p>
            <div className="flex flex-col gap-2 w-full mt-4">
              {starters.map((starter, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(starter)}
                  className="text-start p-3 text-sm bg-secondary/50 hover:bg-secondary rounded-xl transition-colors border border-border/50 text-foreground"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={cn(
              "flex gap-3 max-w-[85%]",
              msg.role === 'user' ? "self-end flex-row-reverse" : "self-start"
            )}>
              <div className={cn(
                "h-8 w-8 shrink-0 rounded-full flex items-center justify-center",
                msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              )}>
                {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={cn(
                "p-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed",
                msg.role === 'user' 
                  ? "bg-primary text-primary-foreground rounded-tr-sm" 
                  : "bg-secondary text-secondary-foreground rounded-tl-sm"
              )}>
                {msg.content}
              </div>
            </div>
          ))
        )}

        {askMutation.isPending && (
          <div className="flex gap-3 max-w-[85%] self-start">
            <div className="h-8 w-8 shrink-0 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="p-4 rounded-2xl bg-secondary rounded-tl-sm flex gap-1 items-center">
              <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        {askMutation.isError && (
          <div className="flex gap-3 max-w-[85%] self-start">
            <div className="h-8 w-8 shrink-0 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div className="p-3 rounded-2xl bg-destructive/10 text-destructive rounded-tl-sm text-sm border border-destructive/20">
              {t('error_asking')}
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-border bg-card rounded-b-3xl">
        <div className="relative flex items-center">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('type_question')}
            className="pe-12 rounded-xl border-border bg-background h-12"
            disabled={askMutation.isPending}
          />
          <Button 
            size="icon" 
            variant="ghost" 
            className="absolute end-1.5 h-9 w-9 text-primary hover:text-primary hover:bg-primary/10"
            onClick={() => handleSend(input)}
            disabled={!input.trim() || askMutation.isPending}
          >
            <Send className="h-5 w-5 rtl:rotate-180" />
          </Button>
        </div>
      </div>
    </>
  );
}

export function DashboardFinancialAssistant() {
  const { t } = useLanguage();
  return (
    <Card className="rounded-3xl shadow-sm border-border flex flex-col overflow-hidden h-[540px]">
      <div className="flex items-center gap-2 p-6 border-b border-border bg-primary/5">
        <Sparkles className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-serif font-bold text-foreground">{t('assistant')}</h2>
      </div>
      <CardContent className="p-0 flex flex-col flex-1 bg-card">
        <FinancialAssistantChat isDashboard={true} />
      </CardContent>
    </Card>
  );
}

export function FloatingFinancialAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  // Do not render the floating widget if we're on the dashboard
  if (location === '/dashboard') return null;

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className={cn(
          "fixed z-50 bottom-24 w-[380px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5",
          "end-4 md:end-8"
        )}>
          <FinancialAssistantChat isDashboard={false} onClose={() => setIsOpen(false)} />
        </div>
      )}

      {/* Floating Action Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed z-50 bottom-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300",
          "end-4 md:end-8",
          isOpen ? "bg-secondary text-secondary-foreground hover:bg-secondary/90 scale-90" : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </Button>
    </>
  );
}
