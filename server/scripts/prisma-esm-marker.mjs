/*
 * The `prisma-client` generator emits ESM source (it uses `import.meta.url`),
 * but the server itself is a CommonJS package. Under `module: nodenext` tsc
 * decides the emit format per-file from the nearest package.json, so without a
 * marker the generated client is compiled to CJS with `import.meta` left in it
 * — Node then re-detects the file as ESM and fails with "exports is not defined".
 *
 * This marker tells tsc (and Node) to treat the generated client as ESM. The
 * rest of the CJS server consumes it through Node's require(esm) support.
 *
 * `prisma generate` clears its output directory, so this is re-applied from the
 * build/start lifecycle scripts rather than committed once.
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
