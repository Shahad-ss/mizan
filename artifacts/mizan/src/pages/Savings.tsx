import { useState } from 'react';
import { useListSavingsGoals, useCreateSavingsGoal, useUpdateSavingsGoal, useDeleteSavingsGoal, useAddSavingsContribution, getListSavingsGoalsQueryKey, useGetProfile } from '@workspace/api-client-react';
import { Card, CardContent, Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label, Progress } from '@/components/ui';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, PiggyBank, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/providers/language-provider';

export default function Savings() {
  const { t, dir } = useLanguage();
  const { data: goals, isLoading } = useListSavingsGoals();
  const { data: profile } = useGetProfile();
  const createGoal = useCreateSavingsGoal();
  const deleteGoal = useDeleteSavingsGoal();
  const addContrib = useAddSavingsContribution();
  const queryClient = useQueryClient();
  
  const [isOpen, setIsOpen] = useState(false);
  const [contribOpenId, setContribOpenId] = useState<number | null>(null);
  
  const currency = profile?.preferredCurrency || "USD";
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat(dir === 'rtl' ? 'ar' : 'en-US', { style: 'currency', currency }).format(val);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      targetAmount: Number(formData.get('targetAmount')),
      currentAmount: Number(formData.get('currentAmount') || 0),
      targetDate: formData.get('targetDate') as string,
    };

    createGoal.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSavingsGoalsQueryKey() });
        setIsOpen(false);
        toast.success("Savings goal created");
      }
    });
  };

  const onContribute = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!contribOpenId) return;
    const formData = new FormData(e.currentTarget);
    addContrib.mutate({ id: contribOpenId, data: { amount: Number(formData.get('amount')) } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSavingsGoalsQueryKey() });
        setContribOpenId(null);
        toast.success("Contribution added!");
      }
    });
  };

  const handleDelete = (id: number) => {
    if(confirm("Delete this savings goal?")) {
      deleteGoal.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSavingsGoalsQueryKey() })
      });
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">{t('savings')}</h1>
          <p className="text-muted-foreground mt-1 text-lg">Save intentionally for what matters most.</p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="rounded-full px-6 shadow-md" size="lg">
          <Plus className="ms-[-0.25rem] me-2 h-5 w-5" /> {t('add_savings')}
        </Button>
      </header>

      {/* CREATE DIALOG */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('add_savings')}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t('name')}</Label>
              <Input name="name" required placeholder="e.g. Dream Vacation" />
            </div>
            <div className="space-y-2">
              <Label>{t('target_amount')}</Label>
              <Input name="targetAmount" type="number" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label>Initial Deposit (Optional)</Label>
              <Input name="currentAmount" type="number" step="0.01" defaultValue="0" />
            </div>
            <div className="space-y-2">
              <Label>{t('target_date')}</Label>
              <Input name="targetDate" type="date" required />
            </div>
            <Button type="submit" className="w-full mt-6" disabled={createGoal.isPending}>{t('save')}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONTRIBUTE DIALOG */}
      <Dialog open={!!contribOpenId} onOpenChange={(open) => !open && setContribOpenId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Contribution</DialogTitle></DialogHeader>
          <form onSubmit={onContribute} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t('amount')}</Label>
              <Input name="amount" type="number" step="0.01" required placeholder="0.00" />
            </div>
            <Button type="submit" className="w-full mt-6" disabled={addContrib.isPending}>Add Funds</Button>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1,2].map(i => <div key={i} className="h-64 rounded-3xl bg-muted animate-pulse" />)}
        </div>
      ) : goals?.length === 0 ? (
        <Card className="rounded-3xl border-dashed">
          <CardContent className="p-16 text-center flex flex-col items-center justify-center">
            <div className="h-16 w-16 bg-secondary text-secondary-foreground rounded-2xl flex items-center justify-center mb-6">
              <PiggyBank className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-serif font-bold mb-2">No savings goals</h3>
            <p className="text-muted-foreground mb-6">Start building your future by creating a goal.</p>
            <Button onClick={() => setIsOpen(true)} variant="outline" className="rounded-full">
              {t('add_savings')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {goals?.map(goal => (
            <Card key={goal.id} className="rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold">{goal.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Goal: {formatCurrency(goal.targetAmount)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(goal.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="mb-6 flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-3xl font-serif text-foreground font-bold">{formatCurrency(goal.currentAmount)}</span>
                    <span className="text-sm font-medium px-2 py-1 bg-secondary rounded-lg">{Math.round(goal.progress)}%</span>
                  </div>
                  <Progress value={goal.progress} className="h-3 bg-secondary/50" />
                </div>
                
                <div className="flex items-center justify-between border-t pt-4 mt-auto">
                  <div className="text-sm text-muted-foreground">
                    Target: {new Date(goal.targetDate).toLocaleDateString()}
                  </div>
                  <Button variant="outline" className="rounded-xl px-6" onClick={() => setContribOpenId(goal.id)}>
                    <Plus className="h-4 w-4 me-2" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}