-- Arqueo de efectivo igual que en el cuaderno del local:
--   caja inicial + ventas en efectivo - gastos = efectivo esperado
--   efectivo esperado = lo que se retira + lo que queda en la caja
-- caja_final pasa a ser "lo que queda en la caja" (la caja inicial del día
-- siguiente) y diferencia_caja = (retiro + caja_final) - efectivo_esperado
-- (0 = coincide, negativo = falta plata, positivo = sobra).

ALTER TABLE cierres
  ADD COLUMN IF NOT EXISTS retiro NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS efectivo_esperado NUMERIC(12,2);

DROP FUNCTION IF EXISTS cerrar_dia(DATE, NUMERIC);

CREATE OR REPLACE FUNCTION cerrar_dia(p_fecha DATE, p_retiro NUMERIC, p_caja_final NUMERIC)
RETURNS cierres
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_totales_por_medio JSONB;
  v_total_ventas NUMERIC(12,2);
  v_total_gastos NUMERIC(12,2);
  v_caja_inicial NUMERIC(12,2);
  v_esperado NUMERIC(12,2);
  v_cierre cierres;
BEGIN
  SELECT COALESCE(jsonb_object_agg(medio_pago, total), '{}'::jsonb), COALESCE(SUM(total), 0)
  INTO v_totales_por_medio, v_total_ventas
  FROM (
    SELECT medio_pago, SUM(monto) AS total
    FROM (
      SELECT medio_pago, monto FROM ventas WHERE fecha = p_fecha
      UNION ALL
      SELECT medio_pago_2, monto_2 FROM ventas WHERE fecha = p_fecha AND medio_pago_2 IS NOT NULL
    ) todos_los_pagos
    GROUP BY medio_pago
  ) sub;

  -- Los gastos no tocan los totales de ventas, pero sí salen de la caja:
  -- se restan del efectivo esperado.
  SELECT COALESCE(SUM(monto), 0) INTO v_total_gastos FROM gastos WHERE fecha = p_fecha;

  SELECT caja_inicial INTO v_caja_inicial FROM cierres WHERE fecha = p_fecha;
  v_esperado := COALESCE(v_caja_inicial, 0)
    + COALESCE((v_totales_por_medio->>'Efectivo')::NUMERIC, 0)
    - v_total_gastos;

  INSERT INTO cierres (
    fecha, totales_por_medio, total_ventas, total_gastos, ganancia_neta,
    efectivo_esperado, retiro, caja_final, diferencia_caja, cerrado, updated_at
  )
  VALUES (
    p_fecha, v_totales_por_medio, v_total_ventas, v_total_gastos, v_total_ventas,
    v_esperado, p_retiro, p_caja_final, (p_retiro + p_caja_final) - v_esperado, true, now()
  )
  ON CONFLICT (fecha) DO UPDATE SET
    totales_por_medio = EXCLUDED.totales_por_medio,
    total_ventas = EXCLUDED.total_ventas,
    total_gastos = EXCLUDED.total_gastos,
    ganancia_neta = EXCLUDED.ganancia_neta,
    efectivo_esperado = EXCLUDED.efectivo_esperado,
    retiro = EXCLUDED.retiro,
    caja_final = EXCLUDED.caja_final,
    diferencia_caja = EXCLUDED.diferencia_caja,
    cerrado = true,
    updated_at = now()
  RETURNING * INTO v_cierre;

  RETURN v_cierre;
END;
$$;

REVOKE EXECUTE ON FUNCTION cerrar_dia(DATE, NUMERIC, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cerrar_dia(DATE, NUMERIC, NUMERIC) FROM anon;
GRANT EXECUTE ON FUNCTION cerrar_dia(DATE, NUMERIC, NUMERIC) TO authenticated;

NOTIFY pgrst, 'reload schema';
