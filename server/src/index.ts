import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import testRoutes from './routes/test.routes';
import categoryRoutes from './routes/category.routes';
import productRoutes from './routes/product.routes';
import transactionRoutes from './routes/transaction.routes';
import ledgerRoutes from './routes/ledger.routes';
import customerRoutes from './routes/customer.routes';
import vendorRoutes from './routes/vendor.routes';
import reportRoutes from './routes/report.routes';
import auditRoutes from './routes/audit.routes';
import vendorBillRoutes from './routes/vendorBill.routes';
import { errorHandler } from './middleware/errorHandler.middleware';
import expenseRoutes from './routes/expense.routes';

dotenv.config();

const app = express();

const allowedOrigins = [
  'http://localhost:5173', // local dev
  process.env.CLIENT_URL, // production frontend (set in Render dashboard)
].filter((origin): origin is string => Boolean(origin));

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'QuickBill server is running' });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/vendor-bills', vendorBillRoutes);
app.use('/api/expenses', expenseRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});