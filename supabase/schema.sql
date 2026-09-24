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

CREATE TABLE ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  medio_pago TEXT NOT NULL CHECK (medio_pago IN ('efectivo', 'transferencia', 'tarjeta')),
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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

-- Un registro por día para todo el negocio (no por usuario).
CREATE TABLE cierres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL UNIQUE,
  total_efectivo NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_transferencia NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_tarjeta NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_ventas NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_gastos NUMERIC(12,2) NOT NULL DEFAULT 0,
  ganancia_neta NUMERIC(12,2) NOT NULL DEFAULT 0,
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

CREATE TRIGGER trg_ventas_bloqueo_cierre
  BEFORE INSERT OR UPDATE OR DELETE ON ventas
  FOR EACH ROW EXECUTE FUNCTION bloquear_dia_cerrado();

CREATE TRIGGER trg_gastos_bloqueo_cierre
  BEFORE INSERT OR UPDATE OR DELETE ON gastos
  FOR EACH ROW EXECUTE FUNCTION bloquear_dia_cerrado();

-- Calcula los totales del día desde ventas/gastos y (re)genera el cierre,
-- dejándolo cerrado. SECURITY INVOKER: corre con los permisos del usuario
-- que la llama, no necesita privilegios elevados.
CREATE OR REPLACE FUNCTION cerrar_dia(p_fecha DATE)
RETURNS cierres
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_total_efectivo NUMERIC(12,2);
  v_total_transferencia NUMERIC(12,2);
  v_total_tarjeta NUMERIC(12,2);
  v_total_ventas NUMERIC(12,2);
  v_total_gastos NUMERIC(12,2);
  v_cierre cierres;
BEGIN
  SELECT
    COALESCE(SUM(monto) FILTER (WHERE medio_pago = 'efectivo'), 0),
    COALESCE(SUM(monto) FILTER (WHERE medio_pago = 'transferencia'), 0),
    COALESCE(SUM(monto) FILTER (WHERE medio_pago = 'tarjeta'), 0),
    COALESCE(SUM(monto), 0)
  INTO v_total_efectivo, v_total_transferencia, v_total_tarjeta, v_total_ventas
  FROM ventas
  WHERE fecha = p_fecha;

  SELECT COALESCE(SUM(monto), 0)
  INTO v_total_gastos
  FROM gastos
  WHERE fecha = p_fecha;

  INSERT INTO cierres (
    fecha, total_efectivo, total_transferencia, total_tarjeta,
    total_ventas, total_gastos, ganancia_neta, cerrado, updated_at
  )
  VALUES (
    p_fecha, v_total_efectivo, v_total_transferencia, v_total_tarjeta,
    v_total_ventas, v_total_gastos, v_total_ventas - v_total_gastos, true, now()
  )
  ON CONFLICT (fecha) DO UPDATE SET
    total_efectivo = EXCLUDED.total_efectivo,
    total_transferencia = EXCLUDED.total_transferencia,
    total_tarjeta = EXCLUDED.total_tarjeta,
    total_ventas = EXCLUDED.total_ventas,
    total_gastos = EXCLUDED.total_gastos,
    ganancia_neta = EXCLUDED.ganancia_neta,
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

REVOKE EXECUTE ON FUNCTION cerrar_dia(DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION reabrir_dia(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cerrar_dia(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION reabrir_dia(DATE) TO authenticated;

-- ---------- RLS ----------

ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_caja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_caja_members_select" ON usuarios_caja
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
