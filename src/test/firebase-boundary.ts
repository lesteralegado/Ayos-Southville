import type { Firestore } from "firebase-admin/firestore";
// External Firebase test double: transaction writes are atomic and serialized,
// and the SDK's read-before-write contract is enforced.
export function firebaseBoundary(records: Map<string, Record<string, unknown>>, hooks: {
  beforeRead?: (path: string) => void;
  beforeCommit?: () => void;
} = {}) {
  let sequence = 0, tail: Promise<unknown> = Promise.resolve();
  const versions = new Map<string, number>();
  const snapshot = (path: string) => ({ id: path.split("/").at(-1)!, exists: records.has(path), ref: document(path), data: () => structuredClone(records.get(path)),
    updateTime: { toMillis: () => versions.get(path) ?? 0 }, createTime: { toMillis: () => 1791676800000 } });
  const write = (path: string, data: Record<string, unknown>, merge = false) => {
    records.set(path, structuredClone({ ...(merge ? records.get(path) : {}), ...data })); versions.set(path, ++sequence);
  };
  const document = (path: string) => ({ path, id: path.split("/").at(-1)!, parent: { id: path.split("/")[0] },
    get: async () => { hooks.beforeRead?.(path); return snapshot(path); }, set: async (data: Record<string, unknown>, options?: { merge?: boolean }) => write(path, data, options?.merge),
    create: async (data: Record<string, unknown>) => { if (records.has(path)) throw new Error("Already exists"); write(path, data); },
    update: async (data: Record<string, unknown>) => { const next = { ...records.get(path), ...data }; for (const [key, value] of Object.entries(data)) if (value && typeof value === "object" && value.constructor.name === "DeleteTransform") delete next[key]; write(path, next); },
    delete: async () => { records.delete(path); versions.set(path, ++sequence); },
  });
  type Filter = { field: string; operation: string; value: unknown };
  type Order = { field: string; direction: "asc" | "desc" };
  const query = (collection: string, filters: Filter[] = [], maximum = Infinity, orders: Order[] = [], after?: unknown[], fields?: string[]) => ({
    doc: (id = crypto.randomUUID()) => document(collection + "/" + id),
    where: (field: string, operation: string, value: unknown) => query(collection, [...filters, { field, operation, value }], maximum, orders, after, fields),
    limit: (limit: number) => query(collection, filters, limit, orders, after, fields),
    orderBy: (field: string | object, direction: "asc" | "desc" = "desc") => query(collection, filters, maximum, [...orders, { field: typeof field === "string" ? field : "__name__", direction }], after, fields),
    startAfter: (...values: unknown[]) => query(collection, filters, maximum, orders, values, fields),
    select: (...selected: string[]) => query(collection, filters, maximum, orders, after, selected),
    get: async () => {
      const valueAt = ([path, data]: [string, Record<string, unknown>], field: string) => field === "__name__" ? path.split("/").at(-1)! : data[field];
      const compare = (left: unknown[], right: unknown[]) => {
        for (let index = 0; index < orders.length; index++) {
          const difference = String(left[index]).localeCompare(String(right[index])) * (orders[index].direction === "asc" ? 1 : -1);
          if (difference) return difference;
        }
        return 0;
      };
      let rows = [...records].filter(([path, data]) => path.startsWith(collection + "/") && filters.every(({ field, operation, value }) => operation === "in" ? Array.isArray(value) && value.includes(data[field]) : data[field] === value));
      if (orders.length) rows = rows.filter(row => orders.every(order => valueAt(row, order.field) !== undefined)).toSorted((a, b) => compare(orders.map(order => valueAt(a, order.field)), orders.map(order => valueAt(b, order.field))));
      if (after) rows = rows.filter(row => compare(orders.map(order => valueAt(row, order.field)), after) > 0);
      const docs = rows.slice(0, maximum).map(([path]) => {
        const doc = snapshot(path);
        return fields ? { ...doc, data: () => Object.fromEntries(fields.filter(field => field in (records.get(path) ?? {})).map(field => [field, structuredClone(records.get(path)?.[field])])) } : doc;
      }); return { docs, size: docs.length, empty: !docs.length };
    },
  });
  const db = {
    collection: (name: string) => query(name),
    getAll: (...refs: ({ get: () => Promise<unknown> } | { fieldMask: string[] })[]) => Promise.all(refs.filter((ref): ref is { get: () => Promise<unknown> } => "get" in ref).map(ref => ref.get())),
    runTransaction: (operation: (transaction: unknown) => Promise<unknown>) => {
      const run = tail.catch(() => undefined).then(async () => {
        const writes: (() => Promise<void> | void)[] = []; let writing = false;
        const read = () => { if (writing) throw new Error("Reads must precede writes"); };
        const result = await operation({
          get: async (ref: { get: () => Promise<unknown> }) => { read(); return ref.get(); },
          getAll: async (...refs: { get: () => Promise<unknown> }[]) => { read(); return Promise.all(refs.map(ref => ref.get())); },
          set: (ref: ReturnType<typeof document>, data: Record<string, unknown>, options?: { merge?: boolean }) => { writing = true; writes.push(() => ref.set(data, options)); },
          update: (ref: ReturnType<typeof document>, data: Record<string, unknown>) => { writing = true; writes.push(() => ref.update(data)); },
          create: (ref: ReturnType<typeof document>, data: Record<string, unknown>) => { writing = true; writes.push(() => ref.create(data)); },
          delete: (ref: ReturnType<typeof document>) => { writing = true; writes.push(() => ref.delete()); },
        });
        hooks.beforeCommit?.();
        const originalRecords = structuredClone(records), originalVersions = new Map(versions), originalSequence = sequence;
        try {
          for (const write of writes) await write();
        } catch (error) {
          records.clear(); for (const [path, data] of originalRecords) records.set(path, data);
          versions.clear(); for (const [path, version] of originalVersions) versions.set(path, version);
          sequence = originalSequence;
          throw error;
        }
        return result;
      }); tail = run; return run;
    },
  };
  return db as unknown as Firestore;
}
