/**
 * Breaking-change detector for the API contract.
 *
 * Compares a committed baseline OpenAPI document with the one generated from
 * the current source and classifies every difference. Anything that could
 * break an existing client is `breaking`; everything else is `additive`.
 *
 * Rules for "breaking":
 *  - a path or operation disappears
 *  - an operation changes owning service (routing moves under clients' feet)
 *  - a documented success response code disappears
 *  - a request parameter is removed, or becomes required
 *  - a new required parameter or required request-body field appears
 *  - a parameter type changes, or an enum loses a value
 *  - a required response property is removed, or a response schema $ref changes
 *  - security is tightened on a previously public operation
 */

import type { OpenApiDocument } from './contract.js';

export interface ContractChange {
  kind: 'breaking' | 'additive';
  path: string;
  method?: string;
  detail: string;
}

export interface ContractDiff {
  breaking: ContractChange[];
  additive: ContractChange[];
  identical: boolean;
}

type AnyObj = Record<string, unknown>;

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

function operations(pathItem: unknown): Record<string, AnyObj> {
  const out: Record<string, AnyObj> = {};
  if (!pathItem || typeof pathItem !== 'object') return out;
  for (const [key, value] of Object.entries(pathItem as AnyObj)) {
    if (METHODS.includes(key) && value && typeof value === 'object') out[key] = value as AnyObj;
  }
  return out;
}

interface Param {
  name: string;
  in: string;
  required: boolean;
  type?: string;
  enum?: unknown[];
}

function params(op: AnyObj, pathItem: AnyObj): Map<string, Param> {
  const list = [
    ...((pathItem['parameters'] as AnyObj[] | undefined) ?? []),
    ...((op['parameters'] as AnyObj[] | undefined) ?? []),
  ];
  const map = new Map<string, Param>();
  for (const raw of list) {
    const schema = (raw['schema'] as AnyObj | undefined) ?? {};
    const param: Param = {
      name: String(raw['name']),
      in: String(raw['in']),
      required: raw['required'] === true,
    };
    if (typeof schema['type'] === 'string') param.type = schema['type'];
    if (Array.isArray(schema['enum'])) param.enum = schema['enum'];
    map.set(`${param.in}:${param.name}`, param);
  }
  return map;
}

function successCodes(op: AnyObj): string[] {
  const responses = (op['responses'] as AnyObj | undefined) ?? {};
  return Object.keys(responses).filter((code) => /^2\d\d$/.test(code));
}

function bodySchema(op: AnyObj): AnyObj | undefined {
  const body = op['requestBody'] as AnyObj | undefined;
  const content = body?.['content'] as AnyObj | undefined;
  const json = content?.['application/json'] as AnyObj | undefined;
  return json?.['schema'] as AnyObj | undefined;
}

function requiredFields(schema: AnyObj | undefined): string[] {
  const req = schema?.['required'];
  return Array.isArray(req) ? req.map(String) : [];
}

function responseRef(op: AnyObj, code: string): string | undefined {
  const responses = (op['responses'] as AnyObj | undefined) ?? {};
  const res = responses[code] as AnyObj | undefined;
  const content = res?.['content'] as AnyObj | undefined;
  const json = content?.['application/json'] as AnyObj | undefined;
  const schema = json?.['schema'] as AnyObj | undefined;
  return typeof schema?.['$ref'] === 'string' ? (schema['$ref'] as string) : undefined;
}

function isPublic(op: AnyObj): boolean {
  const security = op['security'];
  return Array.isArray(security) && security.length === 0;
}

function schemaRequired(components: AnyObj | undefined, name: string): string[] {
  const schemas = (components?.['schemas'] as AnyObj | undefined) ?? {};
  return requiredFields(schemas[name] as AnyObj | undefined);
}

export function diffContracts(baseline: OpenApiDocument, current: OpenApiDocument): ContractDiff {
  const breaking: ContractChange[] = [];
  const additive: ContractChange[] = [];

  const basePaths = (baseline.paths ?? {}) as Record<string, AnyObj>;
  const currPaths = (current.paths ?? {}) as Record<string, AnyObj>;

  for (const [path, baseItem] of Object.entries(basePaths)) {
    const currItem = currPaths[path];
    if (!currItem) {
      breaking.push({ kind: 'breaking', path, detail: 'path removed' });
      continue;
    }

    const baseOps = operations(baseItem);
    const currOps = operations(currItem);

    for (const [method, baseOp] of Object.entries(baseOps)) {
      const currOp = currOps[method];
      if (!currOp) {
        breaking.push({ kind: 'breaking', path, method, detail: 'operation removed' });
        continue;
      }

      const baseOwner = baseOp['x-service'];
      const currOwner = currOp['x-service'];
      if (baseOwner && baseOwner !== currOwner) {
        breaking.push({
          kind: 'breaking',
          path,
          method,
          detail: `owning service changed: ${String(baseOwner)} -> ${String(currOwner)}`,
        });
      }

      for (const code of successCodes(baseOp)) {
        if (!successCodes(currOp).includes(code)) {
          breaking.push({ kind: 'breaking', path, method, detail: `success response ${code} removed` });
        }
        const baseRef = responseRef(baseOp, code);
        const currRef = responseRef(currOp, code);
        if (baseRef && baseRef !== currRef) {
          breaking.push({
            kind: 'breaking',
            path,
            method,
            detail: `response ${code} schema changed: ${baseRef} -> ${String(currRef)}`,
          });
        }
      }

      const baseParams = params(baseOp, baseItem);
      const currParams = params(currOp, currItem);

      for (const [key, baseParam] of baseParams) {
        const currParam = currParams.get(key);
        if (!currParam) {
          breaking.push({ kind: 'breaking', path, method, detail: `parameter ${key} removed` });
          continue;
        }
        if (!baseParam.required && currParam.required) {
          breaking.push({ kind: 'breaking', path, method, detail: `parameter ${key} became required` });
        }
        if (baseParam.type && currParam.type && baseParam.type !== currParam.type) {
          breaking.push({
            kind: 'breaking',
            path,
            method,
            detail: `parameter ${key} type changed: ${baseParam.type} -> ${currParam.type}`,
          });
        }
        if (baseParam.enum) {
          const lost = baseParam.enum.filter((v) => !(currParam.enum ?? []).includes(v));
          if (lost.length > 0) {
            breaking.push({
              kind: 'breaking',
              path,
              method,
              detail: `parameter ${key} lost enum value(s): ${lost.join(', ')}`,
            });
          }
        }
      }

      for (const [key, currParam] of currParams) {
        if (baseParams.has(key)) continue;
        if (currParam.required) {
          breaking.push({ kind: 'breaking', path, method, detail: `new required parameter ${key}` });
        } else {
          additive.push({ kind: 'additive', path, method, detail: `new optional parameter ${key}` });
        }
      }

      const baseRequiredBody = requiredFields(bodySchema(baseOp));
      const currRequiredBody = requiredFields(bodySchema(currOp));
      for (const field of currRequiredBody) {
        if (!baseRequiredBody.includes(field)) {
          breaking.push({ kind: 'breaking', path, method, detail: `new required request field "${field}"` });
        }
      }
      if (!bodySchema(baseOp) && bodySchema(currOp) && currOp['requestBody'] && (currOp['requestBody'] as AnyObj)['required'] === true) {
        breaking.push({ kind: 'breaking', path, method, detail: 'request body became required' });
      }

      if (isPublic(baseOp) && !isPublic(currOp)) {
        breaking.push({ kind: 'breaking', path, method, detail: 'operation now requires authentication' });
      }
    }

    for (const method of Object.keys(currOps)) {
      if (!baseOps[method]) additive.push({ kind: 'additive', path, method, detail: 'operation added' });
    }
  }

  for (const path of Object.keys(currPaths)) {
    if (!basePaths[path]) additive.push({ kind: 'additive', path, detail: 'path added' });
  }

  // Shared response schemas: losing a required property breaks deserialisers.
  const baseSchemas = ((baseline.components as AnyObj | undefined)?.['schemas'] as AnyObj | undefined) ?? {};
  for (const name of Object.keys(baseSchemas)) {
    const before = schemaRequired(baseline.components as AnyObj, name);
    const currentSchemas = ((current.components as AnyObj | undefined)?.['schemas'] as AnyObj | undefined) ?? {};
    if (!currentSchemas[name]) {
      breaking.push({ kind: 'breaking', path: `#/components/schemas/${name}`, detail: 'schema removed' });
      continue;
    }
    const after = schemaRequired(current.components as AnyObj, name);
    for (const field of before) {
      if (!after.includes(field)) {
        breaking.push({
          kind: 'breaking',
          path: `#/components/schemas/${name}`,
          detail: `required property "${field}" removed`,
        });
      }
    }
  }

  return { breaking, additive, identical: breaking.length === 0 && additive.length === 0 };
}

/** Human-readable report used by the CLI and by test failure messages. */
export function formatDiff(diff: ContractDiff): string {
  if (diff.identical) return 'No contract changes.';
  const lines: string[] = [];
  if (diff.breaking.length > 0) {
    lines.push(`BREAKING (${diff.breaking.length}):`);
    for (const c of diff.breaking) lines.push(`  ✗ ${c.method ? `${c.method.toUpperCase()} ` : ''}${c.path} — ${c.detail}`);
  }
  if (diff.additive.length > 0) {
    lines.push(`Additive (${diff.additive.length}):`);
    for (const c of diff.additive) lines.push(`  + ${c.method ? `${c.method.toUpperCase()} ` : ''}${c.path} — ${c.detail}`);
  }
  return lines.join('\n');
}
