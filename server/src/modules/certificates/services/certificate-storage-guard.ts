import { ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '../../../infastructures/prisma/common/client';

/** Prisma's "table / column does not exist" codes — the schema is ahead of the database. */
const MISSING_SCHEMA_CODES = new Set(['P2021', 'P2022']);

/**
 * Turns a read against the issued-certificates table on a database that has not
 * had the migration applied into a 503 the portal and the app can show, rather than
 * a bare "Internal server error". Anything else is rethrown untouched.
 */
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
