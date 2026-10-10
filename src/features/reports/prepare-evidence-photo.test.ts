// @vitest-environment node
import sharp from "sharp";
import { prepareEvidencePhoto } from "./prepare-evidence-photo";

it("decodes real images, strips metadata, and rejects spoofed or animated files", async () => {
  const bytes = await sharp({
    create: { width: 10, height: 10, channels: 3, background: "#234" },
  })
    .jpeg()
    .withMetadata()
    .toBuffer();
  const photo = await prepareEvidencePhoto({ bytes, type: "image/jpeg" });
  expect(photo.type).toBe("image/jpeg");
  expect((await sharp(photo.bytes).metadata()).exif).toBeUndefined();
  await expect(
    prepareEvidencePhoto({
      bytes: new TextEncoder().encode("<script>bad</script>"),
      type: "image/jpeg",
    }),
  ).rejects.toMatchObject({ status: 422 });
  await expect(
    prepareEvidencePhoto({ bytes, type: "image/png" }),
  ).rejects.toMatchObject({ status: 422 });
});
