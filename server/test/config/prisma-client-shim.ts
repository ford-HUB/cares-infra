/**
 * Stand-in for `src/infastructures/prisma/common/client` under Jest.
 *
 * The generated client is ESM (`import.meta.url`) and opens a real database
 * connection, neither of which a unit test wants. `config/jest-unit.json` maps every
 * import of the client here: enums stay real (validators build `z.enum(...)`
 * from them), and the handful of runtime values the services touch are inert.
 */
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
