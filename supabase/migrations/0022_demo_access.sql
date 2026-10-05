-- =============================================================
-- 0022_demo_access.sql
-- Modo demo (docs/demo/spec.md) — T2: función de sembrado.
--
-- public.seed_demo_data(p_user_id) crea un espacio de ejemplo completo
-- (ajustes, categorías, reglas recurrentes, 3 meses de movimientos y
-- presupuestos) para un usuario anónimo. Solo la invoca el trigger de T4;
-- por eso se revoca su ejecución a los roles de la API.
--
-- Decisiones:
--  * Todo es relativo a current_date: la demo siempre tiene "este mes".
--  * Importes en arrays fijos (sin random) → demo reproducible.
--  * Mes actual: solo se insertan movimientos con fecha <= hoy.
--  * Ocio del mes actual = 127,50 € sobre un presupuesto de 150 € (85 %),
--    con fechas limitadas a hoy, para que la alerta (umbral 80 %) salte
--    sea cual sea el día del mes.
--  * Se usan categorías propias del usuario (no las globales user_id NULL),
--    así el visitante puede editarlas sin afectar a nadie.
-- =============================================================

CREATE FUNCTION public.seed_demo_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_month_start date := date_trunc('month', current_date)::date;
  v_today_day   int  := extract(day FROM current_date)::int;

  v_cat_nomina   uuid := gen_random_uuid();
  v_cat_vivienda uuid := gen_random_uuid();
  v_cat_super    uuid := gen_random_uuid();
  v_cat_transp   uuid := gen_random_uuid();
  v_cat_salud    uuid := gen_random_uuid();
  v_cat_rest     uuid := gen_random_uuid();
  v_cat_ocio     uuid := gen_random_uuid();
  v_cat_subs     uuid := gen_random_uuid();

  v_rule_nomina  uuid := gen_random_uuid();
  v_rule_alq     uuid := gen_random_uuid();
  v_rule_spotify uuid := gen_random_uuid();
  v_rule_gym     uuid := gen_random_uuid();
BEGIN
  -- 1. Ajustes (upsert: otro trigger podría haber creado ya la fila).
  INSERT INTO public.user_settings (user_id, base_currency, savings_rate_target)
  VALUES (p_user_id, 'EUR', 20)
  ON CONFLICT (user_id) DO UPDATE
    SET base_currency = 'EUR', savings_rate_target = 20;

  -- 2. Categorías.
  INSERT INTO public.categories (id, user_id, name, color, icon, is_essential) VALUES
    (v_cat_nomina,   p_user_id, 'Nómina',        '#059669', 'briefcase',     false),
    (v_cat_vivienda, p_user_id, 'Vivienda',      '#475569', 'home',          true),
    (v_cat_super,    p_user_id, 'Supermercado',  '#0D9488', 'shopping-cart', true),
    (v_cat_transp,   p_user_id, 'Transporte',    '#2563EB', 'car',           true),
    (v_cat_salud,    p_user_id, 'Salud',         '#E11D48', 'stethoscope',   true),
    (v_cat_rest,     p_user_id, 'Restaurantes',  '#D97706', 'utensils',      false),
    (v_cat_ocio,     p_user_id, 'Ocio',          '#7C3AED', 'popcorn',       false),
    (v_cat_subs,     p_user_id, 'Suscripciones', '#DB2777', 'repeat',        false);

  -- 3. Reglas recurrentes. next_due_date = próxima ocurrencia desde hoy
  --    (días <= 12, así que nunca hay desbordes de fin de mes).
  INSERT INTO public.recurring_rules
    (id, user_id, category_id, description, type, amount, currency, frequency, next_due_date, status)
  SELECT r.id, p_user_id, r.category_id, r.description, r.type::public.transaction_type,
         r.amount, 'EUR', 'monthly'::public.recurring_frequency,
         CASE WHEN v_month_start + (r.day - 1) >= current_date
              THEN v_month_start + (r.day - 1)
              ELSE (v_month_start + interval '1 month')::date + (r.day - 1)
         END,
         'active'::public.recurring_status
  FROM (VALUES
    (v_rule_nomina,  v_cat_nomina,   'Nómina',     'income',  1850.00::numeric, 1),
    (v_rule_alq,     v_cat_vivienda, 'Alquiler',   'expense',  750.00::numeric, 3),
    (v_rule_spotify, v_cat_subs,     'Spotify',    'expense',   10.99::numeric, 12),
    (v_rule_gym,     v_cat_subs,     'Gimnasio',   'expense',   34.90::numeric, 5)
  ) AS r(id, category_id, description, type, amount, day);

  -- 4. Movimientos. Tabla de meses: m = 0 (actual), 1, 2 (anteriores).
  --    Todos los INSERT filtran date <= current_date y date dentro del mes.
  --    Con search_path = '' pg_temp no se resuelve solo: va cualificada.
  CREATE TEMP TABLE pg_temp._demo_months ON COMMIT DROP AS
    SELECT m, (v_month_start - make_interval(months => m))::date AS ms
    FROM generate_series(0, 2) AS m;

  -- 4a. Recurrentes (source = recurring, con recurring_rule_id).
  INSERT INTO public.transactions
    (user_id, category_id, recurring_rule_id, type, source, description, date,
     amount_original, currency_original, currency_base, exchange_rate_used)
  SELECT p_user_id, r.category_id, r.id, r.type::public.transaction_type,
         'recurring'::public.transaction_source, r.description, mo.ms + (r.day - 1),
         r.amount, 'EUR', 'EUR', 1
  FROM pg_temp._demo_months mo
  CROSS JOIN (VALUES
    (v_rule_nomina,  v_cat_nomina,   'Nómina',   'income',  1850.00::numeric, 1),
    (v_rule_alq,     v_cat_vivienda, 'Alquiler', 'expense',  750.00::numeric, 3),
    (v_rule_spotify, v_cat_subs,     'Spotify',  'expense',   10.99::numeric, 12),
    (v_rule_gym,     v_cat_subs,     'Gimnasio', 'expense',   34.90::numeric, 5)
  ) AS r(id, category_id, description, type, amount, day)
  WHERE mo.ms + (r.day - 1) <= current_date;

  -- 4b. Gastos manuales: filas (categoría, descripción, fecha, importe).
  INSERT INTO public.transactions
    (user_id, category_id, type, source, description, date,
     amount_original, currency_original, currency_base, exchange_rate_used)
  SELECT p_user_id, x.category_id, 'expense'::public.transaction_type,
         'manual'::public.transaction_source, x.description, x.d,
         x.amount, 'EUR', 'EUR', 1
  FROM (
    -- Supermercado: 1 compra por semana (+1 extra en semanas 0 y 2).
    SELECT v_cat_super AS category_id, 'Compra supermercado' AS description,
           mo.ms + 7 * w + day_off AS d, mo.ms AS ms,
           (ARRAY[38.40, 52.15, 61.80, 44.90, 75.25, 41.60, 57.30, 36.75])
             [((mo.m * 8 + w * 2 + day_off) % 8) + 1]::numeric AS amount
    FROM pg_temp._demo_months mo
    CROSS JOIN generate_series(0, 3) AS w
    CROSS JOIN (VALUES (1), (4)) AS o(day_off)
    WHERE day_off = 1 OR w IN (0, 2)

    UNION ALL
    -- Transporte: 1 por semana, alternando gasolina / transporte público.
    SELECT v_cat_transp,
           CASE WHEN w % 2 = 0 THEN 'Gasolina' ELSE 'Transporte público' END,
           mo.ms + 7 * w + 2, mo.ms,
           (ARRAY[22.00, 38.50, 16.80, 29.90, 44.00, 19.50, 33.20, 25.60])
             [((mo.m * 4 + w) % 8) + 1]::numeric
    FROM pg_temp._demo_months mo
    CROSS JOIN generate_series(0, 3) AS w

    UNION ALL
    -- Ocio de meses anteriores: el sábado de cada semana.
    SELECT v_cat_ocio, 'Plan de fin de semana',
           (mo.ms + 7 * w + ((6 - extract(dow FROM mo.ms + 7 * w)::int + 7) % 7))::date, mo.ms,
           (ARRAY[24.00, 41.50, 18.00, 36.00, 27.50, 52.00, 21.00, 33.00])
             [((mo.m * 4 + w) % 8) + 1]::numeric
    FROM pg_temp._demo_months mo
    CROSS JOIN generate_series(0, 3) AS w
    WHERE mo.m > 0

    UNION ALL
    -- Ocio del mes actual: 45 + 52,50 + 30 = 127,50 € (85 % de 150 €),
    -- con fechas limitadas a hoy para que el total no dependa del día.
    SELECT v_cat_ocio, o.description,
           v_month_start + (least(o.day, v_today_day) - 1), v_month_start,
           o.amount
    FROM (VALUES
      (5,  'Cine y cena',        45.00::numeric),
      (12, 'Entradas concierto', 52.50::numeric),
      (19, 'Escape room',        30.00::numeric)
    ) AS o(day, description, amount)

    UNION ALL
    -- Restaurantes: el domingo de las semanas 1 y 3.
    SELECT v_cat_rest, 'Comida en restaurante',
           (mo.ms + 7 * w + ((6 - extract(dow FROM mo.ms + 7 * w)::int + 7) % 7) + 1)::date, mo.ms,
           (ARRAY[28.50, 34.00, 22.80, 38.20, 31.40, 26.90])
             [((mo.m * 2 + w / 2) % 6) + 1]::numeric
    FROM pg_temp._demo_months mo
    CROSS JOIN generate_series(0, 3) AS w
    WHERE w IN (1, 3)

    UNION ALL
    -- Salud: 1 gasto el día 15 de cada mes.
    SELECT v_cat_salud, 'Farmacia', mo.ms + 14, mo.ms,
           (ARRAY[18.50, 12.90, 27.40])[mo.m + 1]::numeric
    FROM pg_temp._demo_months mo
  ) AS x
  WHERE x.d <= current_date
    AND x.d < (x.ms + interval '1 month')::date;

  -- 5. Presupuestos (alert_threshold en porcentaje, como valida la app).
  INSERT INTO public.budgets (user_id, category_id, monthly_limit, currency, alert_threshold) VALUES
    (p_user_id, v_cat_ocio,  150.00, 'EUR', 80),
    (p_user_id, v_cat_rest,  120.00, 'EUR', 80),
    (p_user_id, v_cat_super, 350.00, 'EUR', 90);
END;
$$;

COMMENT ON FUNCTION public.seed_demo_data(uuid) IS
  'Siembra datos de ejemplo (3 meses, EUR) para un usuario de la demo. Solo la invoca el trigger on_anonymous_user_created; ejecución revocada a los roles de la API.';

REVOKE EXECUTE ON FUNCTION public.seed_demo_data(uuid) FROM public, anon, authenticated;
