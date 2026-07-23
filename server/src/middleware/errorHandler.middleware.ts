import { Request, Response, NextFunction } from 'express';

// Wraps async route handlers so thrown errors/rejected promises are
// automatically passed to Express's error handling, instead of crashing
// the process or hanging the request.
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// Must be registered LAST, after all routes — Express recognizes it as an
// error handler because it takes 4 arguments.
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err);

  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Something went wrong on our end. Please try again.'
      : err.message || 'Internal server error';

  res.status(status).json({ message });
}