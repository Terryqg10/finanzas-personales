import type { WeekendSpendingRecommendation } from '@/lib/data/dashboard';
import { formatMoney } from '@/lib/format-money';
import { cn } from '@/lib/utils';

export function RecommendationsSection({
  recommendation,
  currency,
}: {
  recommendation: WeekendSpendingRecommendation;
  currency: string;
}) {
  const { currentSavingsRate, savingsRateTarget, weekends, totalAvailable } = recommendation;
  const onTrack = currentSavingsRate >= savingsRateTarget;
  const progressToTarget =
    savingsRateTarget > 0 ? Math.min((currentSavingsRate / savingsRateTarget) * 100, 100) : 100;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm">
      <h3 className="text-foreground mb-4 text-sm font-semibold">Recomendaciones</h3>

      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Ahorro este mes</span>
          <span className={cn('font-medium', onTrack ? 'text-emerald-600' : 'text-foreground')}>
            {currentSavingsRate.toFixed(1)}% · objetivo {savingsRateTarget}%
          </span>
        </div>
        <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
          <div
            className={cn('h-full transition-all', onTrack ? 'bg-primary' : 'bg-amber-500')}
            style={{ width: `${Math.max(progressToTarget, currentSavingsRate > 0 ? 4 : 0)}%` }}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          Guía orientativa según tu objetivo configurado en Configuración — no es asesoría
          financiera profesional.
        </p>
      </div>

      {weekends.length === 0 ? (
        <p className="text-muted-foreground text-sm">No quedan fines de semana este mes.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">
            <span className="text-muted-foreground">Disponible para ocio este mes: </span>
            <span className="text-foreground font-medium">
              {formatMoney(totalAvailable, currency)}
            </span>
          </p>
          <ul className="space-y-2">
            {weekends.map((weekend) => (
              <li
                key={weekend.label}
                className="bg-secondary flex items-center justify-between rounded-xl px-4 py-2.5 text-sm"
              >
                <span>{weekend.label}</span>
                <span className="text-foreground font-medium">
                  {formatMoney(weekend.amount, currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
