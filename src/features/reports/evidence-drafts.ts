export type LocalPhotoDraft = {
  key: string;
  owner: string;
  draftKey: string;
  slotId: string;
  file: Blob;
  createdAt: number;
};

async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("ayos-private-evidence-v1", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("photos", { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function execute<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction("photos", mode);
      const request = operation(transaction.objectStore("photos"));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}
export const saveLocalPhoto = (photo: LocalPhotoDraft) =>
  execute("readwrite", (store) => store.put(photo));
export const removeLocalPhoto = (key: string) =>
  execute("readwrite", (store) => store.delete(key));
export async function readLocalPhotos(owner: string, draftKey: string) {
  const photos = await execute<LocalPhotoDraft[]>("readonly", (store) =>
    store.getAll(),
  );
  const expired = photos.filter(
    (photo) => Date.now() - photo.createdAt >= 86_400_000,
  );
  await Promise.all(expired.map((photo) => removeLocalPhoto(photo.key)));
  return photos
    .filter(
      (photo) =>
        photo.owner === owner &&
        photo.draftKey === draftKey &&
        Date.now() - photo.createdAt < 86_400_000,
    )
    .slice(0, 5);
}
export async function clearLocalPhotos(owner: string, draftKey: string) {
  const photos = await readLocalPhotos(owner, draftKey);
  await Promise.all(photos.map((photo) => removeLocalPhoto(photo.key)));
}
