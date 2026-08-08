/**
 * Minimal in-memory Knex-compatible query builder.
 *
 * It exists so tenant-isolation tests can execute the real route handlers and
 * assert on which rows actually come back, instead of asserting on SQL strings.
 * Only the subset of the Knex API used by the CRUD factory is implemented; any
 * unsupported call throws loudly so the fake can never silently pass a test.
 */

export type Row = Record<string, any>;
export type Store = Record<string, Row[]>;

type Predicate = (row: Row) => boolean;

const like = (value: unknown, pattern: string) =>
  new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*")}$`, "i").test(
    String(value ?? ""),
  );

class FakeQuery implements PromiseLike<any> {
  private preds: Predicate[] = [];
  private orPreds: Predicate[] | null = null;
  private mode: "select" | "count" | "insert" | "update" | "delete" = "select";
  private payload: Row | Row[] = {};
  private takeFirst = false;
  private sort: { column: string; order: "asc" | "desc" } | null = null;
  private limitN: number | null = null;
  private offsetN = 0;

  constructor(private readonly table: string, private readonly store: Store) {
    if (!store[table]) store[table] = [];
  }

  private get rows(): Row[] {
    return this.store[this.table];
  }

  private add(p: Predicate) {
    this.preds.push(p);
    return this;
  }

  where(a: any, b?: any, c?: any): this {
    if (typeof a === "function") {
      const collector = new FakeQuery(this.table, this.store);
      collector.orPreds = [];
      a.call(collector);
      const ors = collector.orPreds;
      return this.add((row) => ors.some((p) => p(row)));
    }
    if (typeof a === "object") {
      const obj = a as Row;
      return this.add((row) => Object.entries(obj).every(([k, v]) => row[k] === v));
    }
    if (c === undefined) return this.add((row) => row[a] === b);
    const op = String(b);
    return this.add((row) => {
      const v = row[a];
      switch (op) {
        case ">": return v > c;
        case ">=": return v >= c;
        case "<": return v < c;
        case "<=": return v <= c;
        case "<>": return v !== c;
        case "like":
        case "ilike": return like(v, String(c));
        default: throw new Error(`FakeQuery: unsupported operator ${op}`);
      }
    });
  }

  whereNot(a: any, b?: any, c?: any): this {
    const probe = new FakeQuery(this.table, this.store).where(a, b, c);
    const inner = probe.preds;
    return this.add((row) => !inner.every((p) => p(row)));
  }

  whereIn(column: string, values: any[]): this {
    return this.add((row) => values.includes(row[column]));
  }

  whereNotIn(column: string, values: any[]): this {
    return this.add((row) => !values.includes(row[column]));
  }

  whereNull(column: string): this {
    return this.add((row) => row[column] === null || row[column] === undefined);
  }

  whereNotNull(column: string): this {
    return this.add((row) => row[column] !== null && row[column] !== undefined);
  }

  orWhereILike(column: string, pattern: string): this {
    if (!this.orPreds) throw new Error("FakeQuery: orWhereILike outside a grouped where()");
    this.orPreds.push((row) => like(row[column], pattern));
    return this;
  }

  orderBy(column: string, order: "asc" | "desc" = "asc"): this {
    this.sort = { column, order };
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  offset(n: number): this {
    this.offsetN = n;
    return this;
  }

  count(_alias?: string): this {
    this.mode = "count";
    return this;
  }

  first(): this {
    this.takeFirst = true;
    return this;
  }

  insert(data: Row | Row[]): this {
    this.mode = "insert";
    this.payload = data;
    return this;
  }

  update(data: Row): this {
    this.mode = "update";
    this.payload = data;
    return this;
  }

  del(): this {
    this.mode = "delete";
    return this;
  }

  returning(_cols: string | string[]): this {
    return this;
  }

  private matched(): Row[] {
    return this.rows.filter((row) => this.preds.every((p) => p(row)));
  }

  private execute(): any {
    if (this.mode === "insert") {
      const items = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((item, i) => ({
        id: item.id ?? `generated-${this.table}-${this.rows.length + i + 1}`,
        created_at: new Date().toISOString(),
        ...item,
      }));
      this.rows.push(...items);
      return items;
    }
    if (this.mode === "update") {
      const hits = this.matched();
      for (const row of hits) Object.assign(row, this.payload);
      return hits;
    }
    if (this.mode === "delete") {
      const hits = this.matched();
      this.store[this.table] = this.rows.filter((row) => !hits.includes(row));
      return hits.length;
    }
    if (this.mode === "count") {
      return [{ count: String(this.matched().length) }];
    }

    let out = this.matched();
    if (this.sort) {
      const { column, order } = this.sort;
      out = [...out].sort((a, b) =>
        a[column] === b[column] ? 0 : (a[column] > b[column] ? 1 : -1) * (order === "desc" ? -1 : 1),
      );
    }
    out = out.slice(this.offsetN, this.limitN === null ? undefined : this.offsetN + this.limitN);
    return this.takeFirst ? out[0] : out;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve()
      .then(() => this.execute())
      .then(onfulfilled ?? undefined, onrejected ?? undefined);
  }
}

export interface FakeDb {
  (table: string): FakeQuery;
  fn: { now: () => string };
  store: Store;
}

export function createFakeDb(seed: Store = {}): FakeDb {
  const store: Store = JSON.parse(JSON.stringify(seed));
  const db = ((table: string) => new FakeQuery(table, store)) as FakeDb;
  db.fn = { now: () => new Date().toISOString() };
  db.store = store;
  return db;
}
