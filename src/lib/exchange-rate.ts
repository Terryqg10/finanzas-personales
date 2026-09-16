import { createAdminClient } from '@/lib/supabase/admin';

export interface ExchangeRateResult {
  rate: number;
  /** true si la tasa devuelta viene de caché antigua porque la API externa falló ahora mismo. */
  stale: boolean;
}

export interface SnapshotStore {
  getSnapshot(base: string, quote: string, date: string): Promise<number | null>;
  getLatestSnapshot(base: string, quote: string): Promise<number | null>;
  saveSnapshot(base: string, quote: string, date: string, rate: number): Promise<void>;
}

function createSupabaseSnapshotStore(): SnapshotStore {
  const supabase = createAdminClient();

  return {
    async getSnapshot(base, quote, date) {
      const { data } = await supabase
        .from('exchange_rate_snapshots')
        .select('rate')
        .eq('base_currency', base)
        .eq('target_currency', quote)
        .eq('snapshot_date', date)
        .maybeSingle();
      return data?.rate ?? null;
    },
    async getLatestSnapshot(base, quote) {
      const { data } = await supabase
        .from('exchange_rate_snapshots')
        .select('rate')
        .eq('base_currency', base)
        .eq('target_currency', quote)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.rate ?? null;
    },
    async saveSnapshot(base, quote, date, rate) {
      await supabase
        .from('exchange_rate_snapshots')
        .upsert(
          { base_currency: base, target_currency: quote, snapshot_date: date, rate },
          { onConflict: 'base_currency,target_currency,snapshot_date' },
        );
    },
  };
}

async function fetchLiveRate(base: string, quote: string): Promise<number> {
  const response = await fetch(
    `https://api.frankfurter.dev/v2/rate/${base.toLowerCase()}/${quote.toLowerCase()}`,
  );

  if (!response.ok) {
    throw new Error(`Frankfurter respondió ${response.status}`);
  }

  const data = (await response.json()) as { rate: number };
  return data.rate;
}

interface GetExchangeRateDeps {
  store?: SnapshotStore;
  fetchRate?: typeof fetchLiveRate;
}

export async function getExchangeRate(
  base: string,
  quote: string,
  deps: GetExchangeRateDeps = {},
): Promise<ExchangeRateResult> {
  if (base === quote) {
    return { rate: 1, stale: false };
  }

  const store = deps.store ?? createSupabaseSnapshotStore();
  const fetchRate = deps.fetchRate ?? fetchLiveRate;
  const today = new Date().toISOString().slice(0, 10);

  const cachedToday = await store.getSnapshot(base, quote, today);
  if (cachedToday !== null) {
    return { rate: cachedToday, stale: false };
  }

  try {
    const rate = await fetchRate(base, quote);
    await store.saveSnapshot(base, quote, today, rate);
    return { rate, stale: false };
  } catch {
    const lastKnown = await store.getLatestSnapshot(base, quote);
    if (lastKnown !== null) {
      return { rate: lastKnown, stale: true };
    }

    throw new Error(
      `No se pudo obtener la tasa de cambio ${base}->${quote} y no hay ninguna en caché.`,
    );
  }
}
