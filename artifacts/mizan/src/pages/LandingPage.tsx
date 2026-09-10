import { Link } from 'wouter';
import { Button } from '@/components/ui';
import { motion } from 'framer-motion';
import { Landmark, ArrowRight, ShieldCheck, Heart, Sparkles, TrendingUp, Receipt, PiggyBank } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20">
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 text-primary">
          <Landmark className="h-8 w-8" />
          <span className="font-serif text-2xl font-bold">Mizan</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in">
            <Button variant="ghost" className="font-medium">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button className="font-medium rounded-full px-6">Get Started</Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-6"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold tracking-wide">
            <Sparkles className="h-4 w-4" /> Find your financial balance
          </span>
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground leading-[1.1] tracking-tight">
            A calm personal space for your finances.
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Manage bills, debts, and savings goals in an environment designed to be trustworthy, warm, and intentional.
          </p>
          <div className="flex items-center justify-center gap-4 pt-8">
            <Link href="/sign-up">
              <Button size="lg" className="rounded-full h-14 px-8 text-lg shadow-lg hover:shadow-xl transition-all">
                Start your journey <ArrowRight className="ms-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 w-full text-start"
        >
          <div className="p-8 rounded-3xl bg-card border border-border shadow-sm">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
              <Receipt className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-serif font-semibold mb-3">Clear Overview</h3>
            <p className="text-muted-foreground leading-relaxed">Never miss a bill again. Track upcoming and overdue payments with gentle, intentional reminders.</p>
          </div>
          <div className="p-8 rounded-3xl bg-card border border-border shadow-sm">
            <div className="h-12 w-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-6">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-serif font-semibold mb-3">Debt Freedom</h3>
            <p className="text-muted-foreground leading-relaxed">Map out your debts and watch your remaining balance shrink over time without the stress.</p>
          </div>
          <div className="p-8 rounded-3xl bg-card border border-border shadow-sm">
            <div className="h-12 w-12 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center mb-6">
              <PiggyBank className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-serif font-semibold mb-3">Goal Savings</h3>
            <p className="text-muted-foreground leading-relaxed">Allocate funds to what matters most. See your savings progress beautifully visualized.</p>
          </div>
        </motion.div>
      </main>

      <footer className="border-t border-border py-12 mt-20 text-center">
        <p className="text-muted-foreground flex items-center justify-center gap-2">
          Designed with <Heart className="h-4 w-4 text-destructive" /> for intentional living.
        </p>
      </footer>
    </div>
  );
}