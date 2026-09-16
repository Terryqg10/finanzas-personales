import { BalanceCard } from '@/components/dashboard/balance-card';
import { BudgetsSection } from '@/components/dashboard/budgets-section';
import { CategoryBreakdownChart } from '@/components/dashboard/category-breakdown-chart';
import { MonthlyEvolutionChart } from '@/components/dashboard/monthly-evolution-chart';
import { RemindersSection } from '@/components/dashboard/reminders-section';
import {
  getBalanceSummary,
  getBudgetProgress,
  getCategoryBreakdown,
  getMonthlyEvolution,
  getPendingRecurringReminders,
} from '@/lib/data/dashboard';
import { getUserSettings } from '@/lib/data/user-settings';

function currentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = now.toISOString().slice(0, 10);
  return { start, end };
}

export default async function DashboardPage() {
  const settings = await getUserSettings();
  const { start, end } = currentMonthRange();

  const [balance, categoryBreakdown, monthlyEvolution, budgets, reminders] = await Promise.all([
    getBalanceSummary(settings.base_currency),
    getCategoryBreakdown(settings.base_currency, start, end),
    getMonthlyEvolution(settings.base_currency, 6),
    getBudgetProgress(settings.base_currency),
    getPendingRecurringReminders(),
  ]);

  const hasAnyData = balance.income > 0 || balance.expense > 0 || balance.otherCurrencyCount > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      {!hasAnyData ? (
        <div className="border-border rounded-md border p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Todavía no has registrado ningún movimiento. Ve a{' '}
            <span className="text-foreground font-medium">Movimientos</span> para empezar.
          </p>
        </div>
      ) : (
        <>
          <BalanceCard summary={balance} />

          <div className="grid gap-4 md:grid-cols-2">
            <CategoryBreakdownChart
              initialData={categoryBreakdown}
              currency={settings.base_currency}
            />
            <MonthlyEvolutionChart data={monthlyEvolution} currency={settings.base_currency} />
          </div>

          <BudgetsSection budgets={budgets} currency={settings.base_currency} />
          <RemindersSection reminders={reminders} />
        </>
      )}
    </div>
  );
}
