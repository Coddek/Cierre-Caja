-- ============================================================
-- Cierre de Caja — schema completo de Supabase
-- Proyecto: "Asiento Contable" (rtxlvkkojrmcfiwutwmr), compartido con otra app.
-- Referencia de todo lo aplicado vía SQL Editor. No es un archivo de
-- migración ejecutable con `supabase db push` (no hay migraciones versionadas
-- en este proyecto todavía) — es documentación del estado actual.
-- ============================================================

-- Evita que CURRENT_DATE calcule mal el día en horario nocturno (UTC vs ARG)
ALTER DATABASE postgres SET timezone TO 'America/Argentina/Buenos_Aires';

-- ---------- TABLAS ----------

-- Configuración editable desde el Table Editor, sin tocar código.
-- "Efectivo" es especial: es el medio que se cuenta en la caja física
-- (cerrar_dia y el frontend lo buscan por ese nombre).
CREATE TABLE medios_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  orden INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sugerencias para la descripción de la venta (texto libre, no lista cerrada).
CREATE TABLE marcas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  orden INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  medio_pago TEXT NOT NULL REFERENCES medios_pago(nombre),
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Pago dividido: la venta se cobró con un segundo medio (ej. parte QR, parte efectivo).
  medio_pago_2 TEXT REFERENCES medios_pago(nombre),
  monto_2 NUMERIC(12,2) CHECK (monto_2 IS NULL OR monto_2 > 0),
  CONSTRAINT ventas_pago2_consistente CHECK ((medio_pago_2 IS NULL) = (monto_2 IS NULL))
);

CREATE TABLE gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  descripcion TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ventas_fecha ON ventas(fecha);
CREATE INDEX idx_gastos_fecha ON gastos(fecha);

-- Lista explícita de quién puede operar esta app (el proyecto de Supabase es
-- compartido con "Asiento Contable" — una sesión válida ahí no alcanza acá).
CREATE TABLE usuarios_caja (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un registro por día para todo el negocio (no por usuario). Se crea al
-- abrir el día (abrir_dia) y se completa al cerrarlo (cerrar_dia).
--
-- Arqueo de efectivo, igual que en el cuaderno del local:
--   efectivo_esperado = caja_inicial + ventas en efectivo - gastos
--   efectivo_esperado = retiro + caja_final
-- caja_final es lo que queda en la caja: la caja inicial del día siguiente.
CREATE TABLE cierres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL UNIQUE,
  totales_por_medio JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { "Efectivo": 242200, "Qr": ... }
  total_ventas NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_gastos NUMERIC(12,2) NOT NULL DEFAULT 0,
  ganancia_neta NUMERIC(12,2) NOT NULL DEFAULT 0,        -- = total_ventas (los gastos no se restan de las ventas)
  caja_inicial NUMERIC(12,2),
  efectivo_esperado NUMERIC(12,2),
  retiro NUMERIC(12,2),
  caja_final NUMERIC(12,2),
  diferencia_caja NUMERIC(12,2),                          -- (retiro + caja_final) - efectivo_esperado; <0 falta, >0 sobra
  cerrado BOOLEAN NOT NULL DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Rastro permanente de reapertura: no se borra al volver a cerrar.
  reabierto_por UUID REFERENCES usuarios_caja(id),
  reabierto_en TIMESTAMPTZ
);

-- ---------- FUNCIONES ----------

-- Chequeo de membresía vía SECURITY DEFINER: evita "infinite recursion
-- detected in policy" que da un EXISTS contra la propia tabla dentro de
-- su propia política RLS.
CREATE OR REPLACE FUNCTION is_usuario_caja(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM usuarios_caja WHERE id = uid);
$$;

REVOKE EXECUTE ON FUNCTION is_usuario_caja(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_usuario_caja(UUID) TO authenticated;

-- Bloquea altas/ediciones/bajas en ventas y gastos de un día ya cerrado.
CREATE OR REPLACE FUNCTION bloquear_dia_cerrado()
RETURNS TRIGGER AS $$
DECLARE
  v_fecha DATE := COALESCE(NEW.fecha, OLD.fecha);
BEGIN
  IF EXISTS (SELECT 1 FROM cierres WHERE fecha = v_fecha AND cerrado = true) THEN
    RAISE EXCEPTION 'El día % ya está cerrado. Reabrí el cierre para poder editar.', v_fecha;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- OJO: al 24/09/2026 estos dos triggers NO están aplicados en la base (la
-- función existe pero no está conectada). Hoy el bloqueo post-cierre lo hace
-- solo el frontend. Para reactivarlo, correr:
--
-- CREATE TRIGGER trg_ventas_bloqueo_cierre
--   BEFORE INSERT OR UPDATE OR DELETE ON ventas
--   FOR EACH ROW EXECUTE FUNCTION bloquear_dia_cerrado();
--
-- CREATE TRIGGER trg_gastos_bloqueo_cierre
--   BEFORE INSERT OR UPDATE OR DELETE ON gastos
--   FOR EACH ROW EXECUTE FUNCTION bloquear_dia_cerrado();

-- Abre el día con la caja inicial (efectivo para dar vuelto). Si el día ya
-- estaba abierto, pisa la caja inicial: sirve también para corregirla.
CREATE OR REPLACE FUNCTION abrir_dia(p_fecha DATE, p_caja_inicial NUMERIC)
RETURNS cierres
LANGUAGE sql
SET search_path = public
AS $$
  INSERT INTO cierres (fecha, caja_inicial, cerrado)
  VALUES (p_fecha, p_caja_inicial, false)
  ON CONFLICT (fecha) DO UPDATE SET caja_inicial = EXCLUDED.caja_inicial
  RETURNING *;
$$;

-- Calcula los totales por medio de pago (sumando las dos partes de los pagos
-- divididos) y el efectivo esperado, guarda el arqueo y deja el día cerrado.
-- SECURITY INVOKER: corre con los permisos (RLS) del usuario que la llama.
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

-- Reabre un día cerrado para permitir correcciones, y deja rastro de quién
-- y cuándo (permanece aunque se vuelva a cerrar).
CREATE OR REPLACE FUNCTION reabrir_dia(p_fecha DATE)
RETURNS cierres
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE cierres
  SET cerrado = false,
      updated_at = now(),
      reabierto_por = auth.uid(),
      reabierto_en = now()
  WHERE fecha = p_fecha
  RETURNING *;
$$;

REVOKE EXECUTE ON FUNCTION abrir_dia(DATE, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cerrar_dia(DATE, NUMERIC, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION reabrir_dia(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION abrir_dia(DATE, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION cerrar_dia(DATE, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION reabrir_dia(DATE) TO authenticated;

-- ---------- RLS ----------

ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE medios_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE marcas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_caja_members_select" ON usuarios_caja
  FOR SELECT TO authenticated
  USING (is_usuario_caja(auth.uid()));

-- Configuración: solo lectura desde la app (se edita desde el dashboard).
CREATE POLICY "medios_pago_select" ON medios_pago
  FOR SELECT TO authenticated
  USING (is_usuario_caja(auth.uid()));

CREATE POLICY "marcas_select" ON marcas
  FOR SELECT TO authenticated
  USING (is_usuario_caja(auth.uid()));

CREATE POLICY "ventas_usuarios_caja" ON ventas
  FOR ALL TO authenticated
  USING (is_usuario_caja(auth.uid()))
  WITH CHECK (is_usuario_caja(auth.uid()));

CREATE POLICY "gastos_usuarios_caja" ON gastos
  FOR ALL TO authenticated
  USING (is_usuario_caja(auth.uid()))
  WITH CHECK (is_usuario_caja(auth.uid()));

CREATE POLICY "cierres_usuarios_caja" ON cierres
  FOR ALL TO authenticated
  USING (is_usuario_caja(auth.uid()))
  WITH CHECK (is_usuario_caja(auth.uid()));

-- ---------- REALTIME ----------

-- REPLICA IDENTITY FULL: sin esto, los eventos DELETE no viajan con las
-- columnas necesarias para que el filtro por fecha los detecte.
ALTER TABLE ventas REPLICA IDENTITY FULL;
ALTER TABLE gastos REPLICA IDENTITY FULL;
ALTER TABLE cierres REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE ventas;
ALTER PUBLICATION supabase_realtime ADD TABLE gastos;
ALTER PUBLICATION supabase_realtime ADD TABLE cierres;
