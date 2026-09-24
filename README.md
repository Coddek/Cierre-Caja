# Cierre de Caja — Martin

App de cierre de caja diario para el local, pensada para instalarse como PWA
desde Safari (Compartir → Agregar a pantalla de inicio). React + TypeScript +
Vite, con Supabase como backend (Postgres + Auth + Realtime).

## Stack

- React 19 + TypeScript + Vite
- Supabase (Postgres, Auth, Realtime) — proyecto compartido con "Asiento Contable"
- Sin backend propio: toda la lógica de negocio (cierre, bloqueo post-cierre,
  permisos) vive en la base, en `supabase/schema.sql`

## Desarrollo local

```bash
npm install
cp .env.example .env   # completar con la URL y anon key del proyecto de Supabase
npm run dev
```

## Base de datos

`supabase/schema.sql` documenta el estado completo del schema (tablas, RLS,
funciones, triggers) tal como está aplicado en el proyecto de Supabase. No es
un archivo de migración ejecutable — los cambios se aplicaron a mano vía el
SQL Editor del dashboard.

## Acceso

Solo las cuentas dadas de alta en la tabla `usuarios_caja` pueden operar la
app, aunque el proyecto de Supabase tenga otras cuentas de "Asiento Contable".
Para dar de alta a alguien: Table Editor → `usuarios_caja` → Insert row, con
su `id` de Authentication → Users.
