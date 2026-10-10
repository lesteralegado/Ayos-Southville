import sharp from "sharp";
import { EvidenceError, type PreparedPhoto } from "./evidence-module";
import { evidenceLimits } from "./media-evidence";

export async function prepareEvidencePhoto(
  photo: PreparedPhoto,
): Promise<PreparedPhoto> {
  try {
    const image = sharp(photo.bytes, {
      limitInputPixels: 40_000_000,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    const formats = {
      "image/jpeg": "jpeg",
      "image/png": "png",
      "image/webp": "webp",
    };
    if (metadata.format !== formats[photo.type] || (metadata.pages ?? 1) !== 1)
      throw new Error("Unsupported image.");
    // Decoding and re-encoding verifies content and removes EXIF, including GPS.
    const bytes = await image
      .rotate()
      .resize({
        width: evidenceLimits.maxDimension,
        height: evidenceLimits.maxDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 78 })
      .toBuffer();
    if (bytes.length > evidenceLimits.outputBytes)
      throw new Error("Photo too large.");
    return { bytes, type: "image/jpeg" };
  } catch {
    throw new EvidenceError(
      "This photo could not be verified. Choose a non-animated JPEG, PNG, or WebP.",
    );
  }
}
