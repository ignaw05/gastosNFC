# gastosNFC

Gestor de gastos, ingresos y costo de productos. Next.js + Postgres (Neon).

## Deploy en Vercel
1. Importar el repo en Vercel.
2. Storage → agregar **Neon** (crea `DATABASE_URL`).
3. Env var `APP_PASSWORD` = la clave de acceso (el usuario puede ser cualquiera).
4. Crear tablas: `vercel env pull .env.local && npm run db:init` (se puede repetir sin problema).

## Local
`.env.local` con `DATABASE_URL` y `APP_PASSWORD`, luego `npm run db:init && npm run dev`.
`npm test` verifica el cálculo de costos en un schema temporal.

## Cómo se calcula
- Costo unitario de un insumo = total gastado / total de unidades compradas (promedio ponderado de todas las compras con ese tipo+nombre).
- Costo de un producto = Σ cantidad × costo unitario de cada insumo.
- Ganancia de un ingreso = monto − comisión − unidades × costo del producto (se vincula por tipo+nombre).
