/** Jest stand-in for the Prisma client (mapped in `config/jest-unit.json`): real enums, inert runtime. */
export * from '../../src/infastructures/prisma/common/enums';

export class PrismaClient {
  constructor(..._args: unknown[]) {}
  $connect() {
    return Promise.resolve();
  }
  $disconnect() {
    return Promise.resolve();
  }
}

class PrismaClientKnownRequestError extends Error {
  code: string;
  meta?: Record<string, unknown>;

  constructor(message: string, options: { code: string; meta?: Record<string, unknown> }) {
    super(message);
    this.code = options.code;
    this.meta = options.meta;
  }
}

export const Prisma = {
  PrismaClientKnownRequestError,
  DbNull: 'DbNull',
  JsonNull: 'JsonNull',
  QueryMode: { default: 'default', insensitive: 'insensitive' },
  TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable',
  },
};
