# QuickBill — Retail Billing & Accounting Management System

A full-stack retail billing and accounting system combining point-of-sale operations with structured double-entry bookkeeping. Every sale is recorded both as a transaction and as a balanced set of ledger entries, enabling real financial reports (Trial Balance, Profit & Loss, Balance Sheet) generated from actual business activity.

## Features

- **Authentication & Roles** — JWT-based auth with Admin and Cashier roles; only Admins can create new user accounts
- **Product & Inventory Management** — Full CRUD with categories, SKU/barcode tracking, low-stock alerts, soft deletes
- **Point of Sale (POS) Billing** — Cart-based checkout with tax/discount calculation, atomic stock decrement via database transactions
- **Double-Entry Accounting** — Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expense); every sale automatically generates balanced debit/credit journal entries
- **Financial Reports** — Trial Balance, Profit & Loss Statement, Balance Sheet, and Sales Reports (daily/weekly/monthly), all derived live from ledger data
- **Customer & Vendor Management** — Directory with search, optional customer attachment on sales
- **Audit Logging** — Tracks key actions (e.g., deletions) with who/what/when
- **Pagination, Search & Filtering** — Across Products, Customers, and Transactions
- **Centralized Error Handling** — Consistent JSON error responses across the API

## Tech Stack

**Backend:** Node.js, Express, TypeScript, PostgreSQL, Prisma ORM, JWT, bcrypt, Zod
**Frontend:** React, TypeScript, Vite, Tailwind CSS v4, React Router, React Hook Form, Axios

## Architecture

- **Double-entry ledger**: Every sale is wrapped in a Prisma database transaction (`$transaction`) that atomically (1) validates and decrements stock, (2) creates the sale record, and (3) creates balanced journal entries. If any step fails — including an unbalanced ledger entry — the entire operation rolls back, so no partial or inconsistent data is ever saved.
- **Money handling**: All monetary values are stored as integer cents in the database to avoid floating-point rounding errors, and converted to/from decimal display values only at the UI boundary.
- **Role-based access control**: Enforced via Express middleware (`requireAuth`, `requireRole`) on the backend, and mirrored on the frontend via protected routes and conditional navigation.

## Project Structure

Quickbill/
├── server/ # Express + TypeScript + Prisma backend
│ ├── prisma/
│ │ ├── schema.prisma
│ │ └── seed.ts # Seeds the Chart of Accounts
│ └── src/
│ ├── controllers/
│ ├── middleware/
│ ├── routes/
│ ├── lib/ # Prisma client, ledger logic, audit logging
│ └── index.ts
└── client/ # React + TypeScript + Vite frontend
└── src/
├── components/
├── context/ # Auth context
├── pages/
└── lib/ # Axios instance, currency helpers

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL installed and running locally

### Backend Setup

```bash
cd server
npm install
```

Create a `.env` file (see `.env.example`) with:

DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/quickbill?schema=public"
JWT_SECRET="a-long-random-string"
PORT=5000

Create the database:
```sql
CREATE DATABASE quickbill;
```

Run migrations and seed the Chart of Accounts:
```bash
npx prisma migrate dev
npx prisma db seed
```

Start the dev server:
```bash
npm run dev
```
Server runs at `http://localhost:5000`.

### Frontend Setup

```bash
cd client
npm install
npm run dev
```
App runs at `http://localhost:5173`.

### First-time setup — creating the first Admin account

The very first user registered becomes bootstrappable without authentication. Register the first Admin via:

POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
"name": "Your Name",
"email": "admin@quickbill.com",
"password": "yourpassword",
"role": "ADMIN"
}

After this, all further user creation must go through the **Users** page in the app (Admin-only) — the public registration endpoint locks itself down automatically once at least one user exists.

## Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Log in, returns JWT |
| POST | `/api/auth/register` | Create user (Admin-only after bootstrap) |
| GET/POST/PUT/DELETE | `/api/products` | Product CRUD |
| GET/POST/PUT/DELETE | `/api/categories` | Category CRUD |
| GET/POST/PUT/DELETE | `/api/customers` | Customer CRUD |
| GET/POST/PUT/DELETE | `/api/vendors` | Vendor CRUD (Admin-only) |
| POST | `/api/transactions` | Create a sale (POS checkout) |
| GET | `/api/transactions` | List transactions (paginated) |
| GET | `/api/ledger/journal-entries` | View the double-entry ledger |
| GET | `/api/reports/trial-balance` | Trial Balance report |
| GET | `/api/reports/profit-and-loss` | P&L statement |
| GET | `/api/reports/balance-sheet` | Balance Sheet |
| GET | `/api/reports/sales` | Sales report (day/week/month) |
| GET | `/api/audit-logs` | Audit log (Admin-only) |

## Notable Engineering Decisions

- **Why PostgreSQL over MongoDB**: Double-entry accounting requires strict referential integrity and atomic multi-table writes (a sale, its stock changes, and its ledger entries must all succeed or all fail together) — a natural fit for a relational database with transactional guarantees.
- **Why debit=credit validation happens in the application layer**: Prisma/Postgres don't support a simple declarative constraint across aggregated child rows, so balance validation is enforced inside the same database transaction that creates the sale — an unbalanced entry throws, causing the whole operation (including stock changes) to roll back.
- **Why Balance Sheet includes "Retained Earnings"**: Assets = Liabilities + Equity must hold at all times. Since sales only directly affect Cash, Revenue, and Tax accounts, accumulated profit (Revenue − Expenses) is folded into Equity as Retained Earnings — standard accounting practice that keeps the sheet balanced.