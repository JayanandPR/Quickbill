import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  role: 'ADMIN' | 'CASHIER';
}

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = '8h'; // a typical work shift

export function signToken(payload: JwtPayload): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not set in environment variables');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}