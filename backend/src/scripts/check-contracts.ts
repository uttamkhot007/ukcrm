/**
 * CI gate: fail the build when the API contract drifts or breaks.
 *
 *   npm run contracts:check        (from backend/)
 *
 * Exit codes:
 *   0  contract matches the committed baseline (or only additive changes with --allow-additive)
 *   1  breaking changes, or the baseline is stale — run `npm run contracts:generate`
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildOpenApiDocument, type OpenApiDocument } from '../platform/contract.js';
import { diffContracts, formatDiff } from '../platform/contract-diff.js';
import { CONTRACTS_DIR } from './generate-openapi.js';

const allowAdditive = process.argv.includes('--allow-additive');
const baselineFile = join(CONTRACTS_DIR, 'openapi.json');

if (!existsSync(baselineFile)) {
  // eslint-disable-next-line no-console
  console.error(`No contract baseline at ${baselineFile}. Run: npm run contracts:generate`);
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(baselineFile, 'utf8')) as OpenApiDocument;
const current = buildOpenApiDocument();
const diff = diffContracts(baseline, current);

if (diff.breaking.length > 0) {
  // eslint-disable-next-line no-console
  console.error(`API contract has breaking changes:\n${formatDiff(diff)}`);
  process.exit(1);
}

if (!diff.identical && !allowAdditive) {
  // eslint-disable-next-line no-console
  console.error(
    `API contract baseline is stale (additive changes only):\n${formatDiff(diff)}\n\n` +
      'Run `npm run contracts:generate` and commit contracts/.',
  );
  process.exit(1);
}

const serialized = `${JSON.stringify(current, null, 2)}\n`;
if (diff.identical && serialized !== readFileSync(baselineFile, 'utf8')) {
  // eslint-disable-next-line no-console
  console.error('Contract baseline is byte-stale. Run `npm run contracts:generate` and commit contracts/.');
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log(diff.identical ? 'API contract matches the baseline.' : `Additive-only changes accepted:\n${formatDiff(diff)}`);
