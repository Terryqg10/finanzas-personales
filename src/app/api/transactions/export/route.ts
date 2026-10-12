import { NextResponse } from 'next/server';

import { getTransactionsForExport } from '@/lib/data/export-transactions';
import { buildExportFilename, buildTransactionsCsv } from '@/lib/export/transactions-csv';
import { createClient } from '@/lib/supabase/server';
import { transactionRangeSchema } from '@/lib/validations/transaction-bulk';

/**
 * Copia en CSV de los movimientos de un periodo (borrado por fechas).
 * GET /api/transactions/export?from=aaaa-mm-dd&to=aaaa-mm-dd&onlyImported=1
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const parsed = transactionRangeSchema.safeParse({
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    onlyImported: params.get('onlyImported') === '1',
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Periodo inválido.' },
      { status: 400 },
    );
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json({ error: 'Error de configuración del servidor.' }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Sesión expirada.' }, { status: 401 });
  }

  const result = await getTransactionsForExport(supabase, parsed.data);

  if (!result.ok) {
    return result.reason === 'too_many'
      ? NextResponse.json(
          { error: 'Hay demasiados movimientos para una sola copia. Reduce el periodo.' },
          { status: 413 },
        )
      : NextResponse.json({ error: 'No se pudo generar la copia.' }, { status: 500 });
  }

  return new NextResponse(buildTransactionsCsv(result.rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${buildExportFilename(parsed.data.from, parsed.data.to)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
