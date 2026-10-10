export const evidenceLimits = {
  count: 5,
  bytes: 8_000_000,
  outputBytes: 1_600_000,
  maxDimension: 1920,
} as const;
const supportedTypes = ["image/jpeg", "image/png", "image/webp"];

export function validateEvidenceFiles(input: File[]) {
  const issues: string[] = [];
  if (input.length > evidenceLimits.count)
    issues.push("Choose up to 5 photos.");
  const candidates = input.slice(0, evidenceLimits.count);
  if (candidates.some((file) => !supportedTypes.includes(file.type)))
    issues.push("Use JPEG, PNG, or WebP photos.");
  if (candidates.some((file) => file.size > evidenceLimits.bytes))
    issues.push("Each original photo must be 8 MB or smaller.");
  return {
    files: candidates.filter(
      (file) =>
        supportedTypes.includes(file.type) && file.size <= evidenceLimits.bytes,
    ),
    issues,
  };
}

export async function compressEvidencePhoto(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function") {
    if (file.size > evidenceLimits.outputBytes)
      throw new Error("Choose a photo smaller than 1.6 MB on this browser.");
    return file;
  }
  const image = await createImageBitmap(file);
  const scale = Math.min(
    1,
    evidenceLimits.maxDimension / Math.max(image.width, image.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    image.close();
    throw new Error("Photo preparation unavailable.");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.78),
  );
  if (!blob || blob.size > evidenceLimits.outputBytes)
    throw new Error("Photo compression failed.");
  return new File([blob], "evidence.jpg", { type: "image/jpeg" });
}
