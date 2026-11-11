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
  const query = (collection: string, filters: [string, unknown][] = [], maximum = Infinity, order?: string) => ({
    doc: (id = crypto.randomUUID()) => document(collection + "/" + id),
    where: (field: string, _operation: string, value: unknown) => query(collection, [...filters, [field, value]], maximum, order),
    limit: (limit: number) => query(collection, filters, limit, order),
    orderBy: (field: string) => query(collection, filters, maximum, field),
    get: async () => {
      let rows = [...records].filter(([path, data]) => path.startsWith(collection + "/") && filters.every(([field, value]) => data[field] === value));
      if (order) rows = rows.toSorted((a, b) => String(b[1][order]).localeCompare(String(a[1][order])));
      const docs = rows.slice(0, maximum).map(([path]) => snapshot(path)); return { docs, size: docs.length, empty: !docs.length };
    },
  });
  const db = {
    collection: (name: string) => query(name),
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
