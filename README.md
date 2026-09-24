# Cierre de Caja — Martin

App de cierre de caja diario para un local comercial: reemplaza la hoja del cuaderno donde se anotaban las ventas del día y se hacía el arqueo a mano. Las ventas se cargan desde el celular durante el día y, al cerrar, la app hace exactamente la misma cuenta que se hacía en papel, con el desglose de cada renglón para poder controlarla.

**En producción:** https://cierre-caja-drab.vercel.app (uso interno del local: el acceso es solo por invitación)

## Funcionalidades

- **Apertura del día** con la caja inicial (el efectivo para dar vuelto), que se propone sola a partir de lo que quedó en la caja el día anterior
- **Carga de ventas y gastos** desde el celular, con edición y borrado; los cambios se ven al instante en todos los dispositivos (Supabase Realtime)
- **Pago dividido:** una venta puede cobrarse con dos medios distintos (ej. parte QR, parte efectivo)
- **Medios de pago configurables** (Efectivo, QR, Tarjeta, cuotas…) y sugerencias de marcas para la descripción, editables desde la base sin tocar código
- **Cierre con arqueo de efectivo**, igual que el cuaderno del local:
  `caja inicial + ventas en efectivo − gastos = retiro + lo que queda en la caja`, avisando si falta o sobra plata
- **Desglose de cada cuenta:** qué ventas está sumando la app en cada medio de pago, para controlarlo contra el papel
- **Resumen del día como imagen** para mandar por WhatsApp (Web Share API), con la estética de la app
- **Continuidad de la caja:** si un día quedó sin cerrar, la app obliga a cerrarlo con su arqueo antes de abrir el siguiente
- **Reapertura** del día para corregir, con registro de quién y cuándo lo editó
- **Historial** de cierres agrupado por mes
- Instalable como PWA en el celular

## Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Backend:** Supabase (Postgres, Auth, Row Level Security, Realtime)
- **Deploy:** Vercel

## Por qué está hecho así

- **La lógica del cierre vive en la base, no en el cliente.** `cerrar_dia()` es una función de Postgres que calcula los totales por medio de pago, el efectivo esperado y la diferencia, y guarda el cierre en una sola operación. El frontend calcula lo mismo solo para mostrar la vista previa mientras se carga el arqueo.
- **Validada contra un día real.** La cuenta se diseñó copiando la hoja del cuaderno del local y se verificó cargando un día real completo (17 ventas, un pago dividido, un gasto): la app da los mismos totales al peso.
- **Acceso por lista explícita.** El proyecto de Supabase es compartido con otra app ([Asiento Contable](https://github.com/Coddek/Asiento-Contable)), así que tener sesión no alcanza: las políticas RLS exigen estar en la tabla `usuarios_caja`, chequeado con una función `SECURITY DEFINER` para evitar recursión en las políticas.
- **Sin backend propio.** Supabase da auth, base, reglas de acceso y tiempo real; no hace falta mantener una API.

## Correr el proyecto localmente

```bash
git clone https://github.com/Coddek/Cierre-Caja.git
cd Cierre-Caja
npm install
cp .env.example .env   # completar con la URL y anon key de tu proyecto de Supabase
npm run dev
```

La base se arma con [`supabase/schema.sql`](supabase/schema.sql), que documenta el schema completo (tablas, funciones, RLS y Realtime) tal como está aplicado. Después hay que cargar al menos un medio de pago llamado `Efectivo` en `medios_pago` y dar de alta a los usuarios en `usuarios_caja` (con su `id` de Authentication → Users).

## Estado del proyecto

En uso real en el local. Pendiente: tests automatizados y volver a activar en la base el bloqueo de cambios sobre días cerrados (hoy lo impide solo el frontend).
