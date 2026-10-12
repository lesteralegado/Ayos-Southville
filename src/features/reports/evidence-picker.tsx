"use client";

import { useEffect, useRef, useState } from "react";
import type { EvidenceAsset } from "./report-module";
import { compressEvidencePhoto, validateEvidenceFiles } from "./media-evidence";
import {
  readLocalPhotos,
  saveLocalPhoto,
  removeLocalPhoto,
  type LocalPhotoDraft,
} from "./evidence-drafts";

type Photo = {
  slotId: string;
  file?: Blob;
  localKey?: string;
  asset?: EvidenceAsset;
  status: "uploading" | "failed" | "complete";
  progress: number;
};
type Props = {
  owner: string;
  draftKey: string;
  locale: "en" | "fil";
  required?: boolean;
  onAssets: (assets: EvidenceAsset[]) => void;
  onBlocked: (blocked: boolean) => void;
};

function uploadPhoto(
  photo: Blob,
  draftKey: string,
  slotId: string,
  progress: (percent: number) => void,
): Promise<EvidenceAsset> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/evidence");
    request.timeout = 90_000;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        progress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = request.ontimeout = () =>
      reject(new Error("Upload interrupted"));
    request.onload = () => {
      try {
        const result = JSON.parse(request.responseText);
        if (result.code === "INTAKE_PAUSED") throw new Error("INTAKE_PAUSED");
        if (request.status < 200 || request.status >= 300 || !result.asset?.id)
          throw new Error("Upload not confirmed");
        resolve(result.asset);
      } catch (error) {
        reject(error);
      }
    };
    const body = new FormData();
    body.set("draftKey", draftKey);
    body.set("slotId", slotId);
    body.set("photo", photo, "evidence.jpg");
    request.send(body);
  });
}
function PhotoPreview({ photo, alt }: { photo: Photo; alt: string }) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (!photo.file) return;
    const preview = URL.createObjectURL(photo.file);
    if (ref.current) ref.current.src = preview;
    return () => URL.revokeObjectURL(preview);
  }, [photo.file]);
  // Restricted photos cannot use public image optimization caches.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={photo.file ? undefined : `/api/evidence/${photo.asset?.id}`}
      alt={alt}
    />
  );
}

export function EvidencePicker({
  owner,
  draftKey,
  locale,
  required = false,
  onAssets,
  onBlocked,
}: Props) {
  const fil = locale === "fil";
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [message, setMessage] = useState("");
  const [recovering, setRecovering] = useState(true);
  const [recoveryFailed, setRecoveryFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    onAssets(photos.flatMap((photo) => (photo.asset ? [photo.asset] : [])));
    onBlocked(
      recovering ||
        recoveryFailed ||
        preparing ||
        photos.some((photo) => photo.status !== "complete"),
    );
  }, [photos, recovering, recoveryFailed, preparing, onAssets, onBlocked]);

  useEffect(() => {
    let alive = true;
    async function recover() {
      try {
        const response = await fetch(
          `/api/evidence?draftKey=${encodeURIComponent(draftKey)}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("Recovery unavailable");
        const { assets } = (await response.json()) as {
          assets: Array<EvidenceAsset & { slotId: string }>;
        };
        let local: LocalPhotoDraft[] = [];
        try {
          local = await readLocalPhotos(owner, draftKey);
        } catch {
          /* Server-completed photos still recover without IndexedDB. */
        }
        // Restore completed slots from the server and retry only interrupted ones.
        const recovered: Photo[] = assets.map((asset) => ({
          slotId: asset.slotId,
          asset,
          status: "complete",
          progress: 100,
        }));
        for (const photo of local) {
          const completed = recovered.find(
            (item) => item.slotId === photo.slotId,
          );
          if (completed) {
            Object.assign(completed, { localKey: photo.key, file: photo.file });
            continue;
          }
          try {
            const asset = await uploadPhoto(
              photo.file,
              draftKey,
              photo.slotId,
              () => undefined,
            );
            const existing = recovered.find(
              (item) => item.asset?.id === asset.id,
            );
            if (existing)
              Object.assign(existing, {
                slotId: photo.slotId,
                localKey: photo.key,
                file: photo.file,
              });
            else
              recovered.push({
                slotId: photo.slotId,
                localKey: photo.key,
                file: photo.file,
                asset,
                status: "complete",
                progress: 100,
              });
          } catch {
            recovered.push({
              slotId: photo.slotId,
              localKey: photo.key,
              file: photo.file,
              status: "failed",
              progress: 0,
            });
          }
        }
        if (alive) {
          setPhotos(recovered);
          setRecoveryFailed(false);
        }
      } catch {
        if (alive) setRecoveryFailed(true);
      } finally {
        if (alive) setRecovering(false);
      }
    }
    void recover();
    return () => {
      alive = false;
    };
  }, [draftKey, owner, attempt]);

  async function upload(photo: Photo) {
    if (!photo.file) return;
    setPhotos((items) =>
      items.map((item) =>
        item.slotId === photo.slotId
          ? { ...item, status: "uploading", progress: 0 }
          : item,
      ),
    );
    try {
      const asset = await uploadPhoto(
        photo.file,
        draftKey,
        photo.slotId,
        (progress) => {
          if (mounted.current)
            setPhotos((items) =>
              items.map((item) =>
                item.slotId === photo.slotId ? { ...item, progress } : item,
              ),
            );
        },
      );
      if (mounted.current)
        setPhotos((items) =>
          items.map((item) =>
            item.slotId === photo.slotId
              ? { ...item, asset, status: "complete", progress: 100 }
              : item,
          ),
        );
    } catch (error) {
      if (error instanceof Error && error.message === "INTAKE_PAUSED")
        setMessage(fil ? "Naka-pause ang bagong ulat. Nananatili ang pribadong litrato sa device; subukan kapag bukas na." : "New reports are paused. Your private photo remains on this device; retry after intake resumes.");
      if (mounted.current)
        setPhotos((items) =>
          items.map((item) =>
            item.slotId === photo.slotId ? { ...item, status: "failed" } : item,
          ),
        );
    }
  }
  async function select(files: File[]) {
    setPreparing(true);
    setMessage("");
    const checked = validateEvidenceFiles(files);
    if (checked.issues.length || files.length + photos.length > 5) {
      setMessage(
        fil
          ? "Pumili ng hanggang 5 JPEG, PNG, o WebP na hindi lalampas sa 8 MB bawat isa."
          : "Choose up to 5 JPEG, PNG, or WebP photos, up to 8 MB each.",
      );
      setPreparing(false);
      return;
    }
    for (const file of checked.files) {
      try {
        const compressed = await compressEvidencePhoto(file);
        const slotId = crypto.randomUUID();
        const localKey = `${owner}:${draftKey}:${slotId}`;
        const photo: Photo = {
          slotId,
          file: compressed,
          localKey,
          status: "uploading",
          progress: 0,
        };
        try {
          await saveLocalPhoto({
            key: localKey,
            owner,
            draftKey,
            slotId,
            file: compressed,
            createdAt: Date.now(),
          });
        } catch {
          setMessage(
            fil
              ? "Hindi available ang lokal na photo recovery. Panatilihing bukas ang tab hanggang matapos ang upload."
              : "Device photo recovery is unavailable. Keep this tab open until upload completes.",
          );
        }
        setPhotos((items) => [...items, photo]);
        await upload(photo);
      } catch {
        setMessage(
          fil
            ? "Hindi maihanda ang litrato. Pumili muli ng mas maliit na litrato."
            : "This photo could not be prepared. Choose a smaller photo again.",
        );
      }
    }
    setPreparing(false);
  }
  async function remove(photo: Photo) {
    try {
      // Cancellation by owned slot also handles an ambiguous upload response.
      // The server tombstone prevents an in-flight upload from resurrecting it.
      const url = photo.asset
        ? `/api/evidence/${photo.asset.id}`
        : `/api/evidence?draftKey=${encodeURIComponent(draftKey)}&slotId=${encodeURIComponent(photo.slotId)}`;
      const response = await fetch(url, { method: "DELETE" });
      if (!response.ok) throw new Error("Removal unavailable");
      if (photo.localKey) await removeLocalPhoto(photo.localKey);
      setPhotos((items) =>
        items.filter((item) => item.slotId !== photo.slotId),
      );
    } catch {
      setMessage(
        fil
          ? "Hindi makumpirma ang pag-alis. Kumonekta at subukan muli."
          : "Removal could not be confirmed. Reconnect and retry.",
      );
    }
  }
  const busy =
    recovering ||
    preparing ||
    photos.some((photo) => photo.status === "uploading");
  return (
    <fieldset className="evidence-fieldset">
      <legend>
        {fil ? "Mga litrato bilang ebidensya" : "Evidence photos"}
      </legend>
      <p className="field-help">
        {required
          ? fil
            ? "Kailangan ang kahit isang nakumpletong litrato. Hanggang 5 litrato. Pribado ang mga file; mae-expire ang hindi naisumiteng upload pagkalipas ng 24 oras."
            : "At least one completed photo is required. Up to 5 photos. Files are private; unsubmitted uploads expire after 24 hours."
          : fil
          ? "Opsyonal. Hanggang 5 litrato. Pribado ang mga file; ang may-ari at awtorisadong operator lamang ang may access. Mae-expire ang hindi naisumiteng upload pagkalipas ng 24 oras."
          : "Optional. Up to 5 photos. Files are private to you and authorized operators. Unsubmitted uploads expire after 24 hours."}
      </p>
      <label htmlFor="evidence-photos">
        {fil ? "Pumili ng mga litrato" : "Choose photos"}
      </label>
      <input
        id="evidence-photos"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={busy || recoveryFailed || photos.length >= 5}
        onChange={(event) => {
          void select(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <p role="status" aria-live="polite" className="field-help">
        {recovering
          ? fil
            ? "Binabawi ang mga pribadong upload…"
            : "Recovering private uploads…"
          : recoveryFailed
            ? fil
              ? "Hindi mabawi ang mga litrato. Kumonekta at subukan muli bago magsumite."
              : "Photos could not be recovered. Reconnect and retry before submitting."
            : message ||
              (photos.length === 0
                ? required
                  ? fil
                    ? "Wala pang litrato. Mag-upload ng ebidensya bago markahang nalutas."
                    : "No photos yet. Upload evidence before marking resolved."
                  : fil
                  ? "Wala pang litrato. Maaari kang magsumite nang walang litrato."
                  : "No photos yet. You can submit without a photo."
                : `${photos.filter((photo) => photo.status === "complete").length}/${photos.length} ${fil ? "upload ang nakumpirma" : "uploads confirmed"}`)}
      </p>
      {recoveryFailed && (
        <button
          type="button"
          className="button button-quiet"
          onClick={() => {
            setRecovering(true);
            setAttempt((value) => value + 1);
          }}
        >
          {fil ? "Subukan ang recovery" : "Retry recovery"}
        </button>
      )}
      <div className="evidence-previews">
        {photos.map((photo, index) => (
          <figure key={photo.slotId}>
            <PhotoPreview
              photo={photo}
              alt={`${fil ? "Pribadong litrato" : "Private photo"} ${index + 1}`}
            />
            <figcaption>
              <span>
                {fil ? "Litrato" : "Photo"} {index + 1} ·{" "}
                {photo.status === "complete"
                  ? fil
                    ? "Pribado · nakumpirma"
                    : "Private · confirmed"
                  : photo.status === "failed"
                    ? fil
                      ? "Naputol · subukan muli"
                      : "Interrupted · retry"
                    : `${fil ? "Ina-upload" : "Uploading"} ${photo.progress}%`}
              </span>
              {photo.status === "uploading" && (
                <progress
                  max={100}
                  value={photo.progress}
                  aria-label={fil ? "Progreso ng upload" : "Upload progress"}
                />
              )}
              {photo.status === "failed" && (
                <button type="button" onClick={() => void upload(photo)}>
                  {fil ? "Subukan ang upload" : "Retry upload"}
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(photo)}
                aria-label={`${fil ? "Alisin ang litrato" : "Remove photo"} ${index + 1}`}
              >
                {fil ? "Alisin" : "Remove"}
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
    </fieldset>
  );
}
