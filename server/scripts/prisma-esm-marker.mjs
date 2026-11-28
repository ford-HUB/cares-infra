/*
 * Marks the generated Prisma client (ESM: `import.meta.url`) as ESM so tsc
 * doesn't emit it as CJS in this CommonJS package ("exports is not defined").
 * Re-run on build/start because `prisma generate` wipes the output dir.
 */
import { writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(serverRoot, 'src', 'infastructures', 'prisma', 'common');

if (!existsSync(outDir)) {
  console.warn(
    `[prisma-esm-marker] ${outDir} does not exist — run \`prisma generate\` first.`,
  );
  process.exit(0);
}

writeFileSync(join(outDir, 'package.json'), '{ "type": "module" }\n');
