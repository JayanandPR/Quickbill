import { Request, Response, NextFunction } from 'express';

/**
 * Restricts a route to specific roles.
 * Must be used AFTER requireAuth, since it relies on req.user being set.
 *
 * Usage: router.get('/admin-only', requireAuth, requireRole('ADMIN'), handler)
 */
export function requireRole(...allowedRoles: Array<'ADMIN' | 'CASHIER'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Requires role: ${allowedRoles.join(' or ')}`,
      });
    }

    next();
  };
}