# Cierre de Caja

Vite + React + TypeScript, Supabase (auth, RLS y funciones en SQL). Cierre de caja diario de una tienda ("Martin" es el nombre del negocio, se queda).

## Comandos
- `npm run dev`.
- `npm run build`: corre `tsc -b` y `vite build`.
- `npm run lint`: oxlint.
- `npm test`: vitest. Los tests están junto a la lógica pura en `src/lib/*.test.ts`.
- El hook Stop (`.claude/hooks/verificar.sh`) corre `tsc -b` y los tests antes de terminar si hubo cambios. La CI (`.github/workflows/ci.yml`) corre lint, test y build en cada push.
- Toda lógica nueva de cálculo va en `src/lib/` con su test; los componentes solo la usan.

## Reglas
- El esquema y las funciones están en `supabase/schema.sql`. `cerrar_dia()` calcula el cierre en la base.
- La vista previa del frontend (`calcularEfectivoEsperado` en `src/lib/totalesPorMedio.ts`) tiene que dar lo mismo que `cerrar_dia()`. Si tocás una, tocá la otra.
- Toda tabla nueva lleva RLS. Las funciones SECURITY DEFINER llevan `set search_path`.
- El acceso es por usuarios autorizados (tabla `usuarios_caja`), no por roles.
- Comparte el proyecto de Supabase con Asiento-Contable: no rompas tablas ajenas.
