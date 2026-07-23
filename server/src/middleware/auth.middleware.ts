import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';

// Extend Express's Request type so `req.user` is typed everywhere else
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization; // expected format: "Bearer <token>"

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // now available in every route after this middleware
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Like requireAuth, but doesn't fail if there's no token —
// just leaves req.user undefined. Used for routes whose behavior
// depends on whether someone happens to be logged in.
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = verifyToken(token);
    } catch {
      // invalid/expired token — just proceed without req.user
    }
  }

  next();
}