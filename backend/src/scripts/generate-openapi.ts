/**
 * Regenerates the committed API contracts.
 *
 *   npm run contracts:generate   (from backend/)
 *
 * Writes the aggregate gateway contract plus one document per service. Commit
 * the result: CI compares against it and fails on breaking changes.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildOpenApiDocument, buildServiceDocument } from '../platform/contract.js';
import { ROUTABLE_SERVICES } from '../platform/manifest.js';

const here = dirname(fileURLToPath(import.meta.url));
export const CONTRACTS_DIR = join(here, '../../contracts');

function write(file: string, doc: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
}

export function generateContracts(dir = CONTRACTS_DIR): string[] {
  const written: string[] = [];

  const aggregate = join(dir, 'openapi.json');
  write(aggregate, buildOpenApiDocument());
  written.push(aggregate);

  for (const service of ROUTABLE_SERVICES) {
    const doc = buildServiceDocument(service.name);
    if (Object.keys(doc.paths).length === 0) continue;
    const file = join(dir, 'services', `${service.name}.json`);
    write(file, doc);
    written.push(file);
  }

  return written;
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  const files = generateContracts();
  // eslint-disable-next-line no-console
  console.log(`Wrote ${files.length} contract file(s):\n${files.map((f) => `  ${f}`).join('\n')}`);
}
