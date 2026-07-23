# QuickBill — Server (Phase 0 scaffold)

Express + TypeScript + Prisma (PostgreSQL) backend scaffold.

## What's already done
- Express + TypeScript project structure
- Dependencies installed: express, cors, dotenv, bcryptjs, jsonwebtoken (+ types)
- Prisma + @prisma/client installed
- `prisma/schema.prisma` created (empty — models added in later phases)
- `.env` created with placeholder `DATABASE_URL`
- Basic Express server (`src/index.ts`) with `/` and `/health` routes

## Setup steps (run these in order after opening this folder in VS Code)

### 1. Install dependencies
```bash
npm install
```
(This re-installs everything into your local `node_modules`, since that folder isn't included in the zip.)

### 2. Set your database password
Open `.env` and replace `YOUR_PASSWORD` with the password you set when installing Postgres locally:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/quickbill?schema=public"
```

### 3. Create the database (if you haven't already)
Open **SQL Shell (psql)** and run:
```sql
CREATE DATABASE quickbill;
```

### 4. Generate the Prisma client
```bash
npx prisma generate
```

### 5. Run the dev server
```bash
npm run dev
```
Visit `http://localhost:5000` — you should see `{ "message": "QuickBill server is running" }`.

## Next step (Phase 0 continued)
We'll add the `User` and `Account` models to `prisma/schema.prisma`, then run:
```bash
npx prisma migrate dev --name init
```
This creates the actual tables in your `quickbill` database.

## Available scripts
- `npm run dev` — start dev server with auto-reload
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run compiled build
- `npm run prisma:generate` — regenerate Prisma client after schema changes
- `npm run prisma:migrate` — create/apply a new migration
- `npm run prisma:studio` — open Prisma's visual DB browser
