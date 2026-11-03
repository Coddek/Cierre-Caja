#!/usr/bin/env bash
# Hook "Stop" de Claude Code: antes de que Claude dé la tarea por terminada,
# corre el chequeo de tipos y los tests. Si algo falla, sale con código 2 y
# Claude recibe el error y tiene que arreglarlo antes de terminar.

cd "$CLAUDE_PROJECT_DIR" || exit 0

# Si Claude ya está siguiendo a un rechazo de este hook, no lo bloqueamos de
# nuevo en el mismo turno (evita un loop infinito).
if grep -q '"stop_hook_active": *true'; then exit 0; fi

# Sin cambios en el código no hay nada que verificar.
if [ -z "$(git status --porcelain -- src package.json supabase)" ]; then exit 0; fi

if ! salida=$(npx tsc -b 2>&1); then
  echo "Falla el chequeo de tipos (npx tsc -b). Arreglalo antes de terminar:" >&2
  echo "$salida" | tail -30 >&2
  exit 2
fi

if ! salida=$(npx vitest run --reporter=dot 2>&1); then
  echo "Fallan los tests (npm test). Arreglalos antes de terminar:" >&2
  echo "$salida" | tail -40 >&2
  exit 2
fi

exit 0
