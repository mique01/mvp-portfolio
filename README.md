# Apex Wealth Hub

CRM de clientes para asesores financieros, preparado para desplegarse en Vercel con backend sobre Postgres (Neon recomendado).

## Stack

- Frontend: React + TanStack Start
- Backend: TanStack Server Functions
- Persistencia: Postgres compatible con Neon, Supabase o Vercel Marketplace

## Variables de entorno

Defini una de estas variables para conexion real:

- `NEON_DATABASE_URL`
- `DATABASE_URL`
- `POSTGRES_URL`

Opcional para desarrollo:

- `CRM_ALLOW_SEED_FALLBACK=1` para habilitar modo semilla/demo si no hay DB disponible.

Y para precio real de mercado, agrega las URLs de tus endpoints:

- `MARKET_DATA_CEDEARS_URL`
- `MARKET_DATA_BONDS_URL`
- `MARKET_DATA_CORP_URL`
- `MARKET_DATA_NOTES_URL`
- `MARKET_DATA_FCI_RENTAFIJA_URL`
- `MARKET_DATA_FCI_RENTAMIXTA_URL`
- `MARKET_DATA_FCI_RENTAVARIABLE_URL`
- `MARKET_DATA_FCI_MERCADODINERO_URL`
- `MARKET_DATA_FCI_RETORNOTOTAL_URL`

## Desarrollo local

```bash
npm install
npm run dev
```

Sin `NEON_DATABASE_URL`/`DATABASE_URL`, la app ahora falla por defecto para evitar usar datos mock por accidente.
Si queres modo demo, activa `CRM_ALLOW_SEED_FALLBACK=1`.

## Build

```bash
npm run build
```

## Deploy en Vercel

Este repo incluye:

- `api/server.js` para servir la app full-stack en Vercel Functions
- `vercel.json` con routing y salida estatica

Para persistencia real:

1. Conecta un Postgres desde Neon/Supabase/Vercel Marketplace.
2. Configura `NEON_DATABASE_URL` (recomendado para Neon) o `DATABASE_URL`.
3. Despliega el proyecto.

La primera vez que la app encuentra una base vacia, crea tablas y carga datos iniciales automaticamente.

## Hardening de Neon (produccion)

Si vas a operar con datos reales de cartera, aplica los scripts en este orden en Neon SQL Editor:

1. `sql/01_audit_checks.sql` (solo lectura: detecta duplicados, inconsistencias y problemas de joins).
2. `sql/02_production_migration.sql` (migracion de esquema, constraints, precision decimal e indices).
3. `sql/03_rls.sql` (aislamiento por asesor con Row-Level Security).

Antes de aplicar la migracion productiva, toma snapshot o branch de respaldo en Neon.
