import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken } from '../utils/jwt';

const SALT_ROUNDS = 10;

// ── Validation schemas ──────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'CASHIER']).optional(), // defaults to CASHIER if omitted
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ── Controllers ──────────────────────────────────────

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const userCount = await prisma.user.count();
  const isBootstrap = userCount === 0;

  if (!isBootstrap) {
    // Once at least one user exists, only a logged-in Admin can create new accounts
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({
        message: 'Only an Admin can create new user accounts',
      });
    }
  }

  const { name, email, password, role } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ message: 'A user with this email already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: role ?? 'CASHIER',
    },
  });

  const token = signToken({ userId: user.id, role: user.role });

  return res.status(201).json({
    message: 'User registered successfully',
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  if (!user.isActive) {
    return res.status(403).json({ message: 'This account has been deactivated' });
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = signToken({ userId: user.id, role: user.role });

  return res.status(200).json({
    message: 'Login successful',
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

export async function me(req: Request, res: Response) {
  // req.user is set by requireAuth middleware
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.status(200).json({ user });
}