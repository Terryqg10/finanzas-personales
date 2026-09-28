import { BalanceCard } from '@/components/dashboard/balance-card';
import { BudgetsSection } from '@/components/dashboard/budgets-section';
import { CategoryBreakdownChart } from '@/components/dashboard/category-breakdown-chart';
import { MonthlyEvolutionChart } from '@/components/dashboard/monthly-evolution-chart';
import { MonthlySummaryCard } from '@/components/dashboard/monthly-summary-card';
import { RecommendationsSection } from '@/components/dashboard/recommendations-section';
import { RemindersSection } from '@/components/dashboard/reminders-section';
import { getMonthRange } from '@/lib/date-range';
import {
  getBalanceSummary,
  getBudgetProgress,
  getCategoryBreakdown,
  getMonthlyEvolution,
  getPendingRecurringReminders,
  getPeriodSummary,
  getWeekendSpendingRecommendation,
} from '@/lib/data/dashboard';
import { buildRateMap, getUserCurrencies } from '@/lib/data/user-currencies';
import { getUserSettings } from '@/lib/data/user-settings';

function currentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = now.toISOString().slice(0, 10);
  return { start, end };
}

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default async function DashboardPage() {
  const settings = await getUserSettings();
  const { start, end } = currentMonthRange();
  const currentMonth = currentYearMonth();
  const currentMonthFullRange = getMonthRange(currentMonth);

  // Se calculan de una vez todas las tasas que hagan falta (moneda de cada
  // movimiento/presupuesto/regla recurrente -> moneda base actual) antes de
  // llamar a las funciones de agregación, que ya no filtran por moneda sino
  // que convierten "al vuelo" con este mapa. Ver
  // specs/conversion-moneda-base-al-vuelo.md.
  const currencies = await getUserCurrencies();
  const rates = await buildRateMap(currencies, settings.base_currency);

  const [
    balance,
    periodSummary,
    categoryBreakdown,
    monthlyEvolution,
    budgets,
    reminders,
    recommendation,
  ] = await Promise.all([
    getBalanceSummary(settings.base_currency, rates),
    getPeriodSummary(
      settings.base_currency,
      currentMonthFullRange.start,
      currentMonthFullRange.end,
      rates,
    ),
    getCategoryBreakdown(settings.base_currency, start, end, rates),
    getMonthlyEvolution(settings.base_currency, rates, 6),
    getBudgetProgress(settings.base_currency, rates),
    getPendingRecurringReminders(),
    getWeekendSpendingRecommendation(settings.base_currency, settings.savings_rate_target, rates),
  ]);

  const hasAnyData = balance.income > 0 || balance.expense > 0 || balance.otherCurrencyCount > 0;

  return (
    <div className="space-y-8">
      <h1 className="text-foreground text-3xl font-bold tracking-tight">Dashboard</h1>

      {!hasAnyData ? (
        <div className="bg-card rounded-2xl p-10 text-center shadow-sm">
          <p className="text-muted-foreground text-sm">
            Todavía no has registrado ningún movimiento. Ve a{' '}
            <span className="text-foreground font-medium">Movimientos</span> para empezar.
          </p>
        </div>
      ) : (
        <>
          <BalanceCard summary={balance} />

          <MonthlySummaryCard
            initialData={periodSummary}
            initialMonth={currentMonth}
            currency={settings.base_currency}
            rates={rates}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <CategoryBreakdownChart
              initialData={categoryBreakdown}
              currency={settings.base_currency}
              rates={rates}
            />
            <MonthlyEvolutionChart data={monthlyEvolution} currency={settings.base_currency} />
          </div>

          <BudgetsSection budgets={budgets} currency={settings.base_currency} />
          <RecommendationsSection
            recommendation={recommendation}
            currency={settings.base_currency}
          />
          <RemindersSection reminders={reminders} />
        </>
      )}
    </div>
  );
}
