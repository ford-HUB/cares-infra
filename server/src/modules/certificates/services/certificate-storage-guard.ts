import { ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '../../../infastructures/prisma/common/client';

/** Table/column missing: schema ahead of the database. */
const MISSING_SCHEMA_CODES = new Set(['P2021', 'P2022']);

/** Unmigrated database → 503; anything else rethrown. */
export async function withCertificateStorage<T>(
  read: () => Promise<T>,
): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      MISSING_SCHEMA_CODES.has(error.code)
    ) {
      throw new ServiceUnavailableException(
        'Certificate records are not set up on this database yet — apply the pending migration (add_issued_certificates) and restart the server.',
      );
    }
    throw error;
  }
}
