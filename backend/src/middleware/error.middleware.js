const { Prisma } = require('@prisma/client');
const { env } = require('../config/env');

//****** HTTP errors + Prisma codes **************//

class AppError extends Error {
  constructor(message, statusCode = 400, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
  }
}

function mapPrismaKnownRequestError(err) {
  switch (err.code) {
    case 'P2025':
      return new AppError('Record not found', 404);
    case 'P2002':
      return new AppError('A record with this value already exists', 409, [
        {
          field: err.meta?.target ? String(err.meta.target) : 'constraint',
          message: 'Unique constraint violation',
        },
      ]);
    case 'P2003':
      return new AppError('Related record not found or invalid reference', 400);
    case 'P2021':
      return new AppError('Table does not exist — run database migrations', 500);
    case 'P1008':
      return new AppError(
        env.NODE_ENV === 'production'
          ? 'Database temporarily unavailable'
          : 'SQLite timed out (P1008 — often locked). Close Prisma Studio or other terminals using dev.db, stop duplicate API processes, increase busy_timeout on DATABASE_URL (see backend/.env.example), then retry.',
        503,
        [{ field: 'code', message: 'P1008' }],
      );
    default:
      console.error('[prisma]', err.code, err.meta ?? '', err.message);
      return new AppError(
        env.NODE_ENV === 'production'
          ? 'Database operation failed'
          : `${err.message || 'Database error'} (Prisma ${err.code})`,
        500,
        [{ field: 'code', message: String(err.code) }],
      );
  }
}

function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let e = err;

  if (e instanceof Prisma.PrismaClientValidationError) {
    console.warn('[prisma-validation]', e.message.slice(0, 800));
    e = new AppError(
      env.NODE_ENV === 'production'
        ? 'Invalid request body or data shape'
        : e.message.split('\n').slice(0, 5).join(' '),
      400,
    );
  } else if (e instanceof Prisma.PrismaClientKnownRequestError && !e.statusCode) {
    e = mapPrismaKnownRequestError(e);
  }

  const statusCode = e.statusCode && Number.isInteger(e.statusCode) ? e.statusCode : 500;
  const message =
    statusCode === 500 && env.NODE_ENV === 'production'
      ? 'Internal server error'
      : e.message || 'Something went wrong';

  const errors = Array.isArray(e.errors) ? e.errors : [];

  if (statusCode >= 500) {
    console.error('[error]', env.NODE_ENV === 'production' ? message : e);
  } else {
    console.warn('[warn]', message, errors.length ? errors : '');
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}

module.exports = { AppError, errorMiddleware };
