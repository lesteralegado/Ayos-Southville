import { validateEvidenceFiles } from "./media-evidence";

describe("evidence photo selection", () => {
  it("accepts supported photos within limits", () => {
    const files = [new File(["photo"], "drain.jpg", { type: "image/jpeg" })];
    expect(validateEvidenceFiles(files)).toEqual({ files, issues: [] });
  });

  it("rejects unsupported, oversized, and excess photos", () => {
    const files = [new File([new Uint8Array(8_000_001)], "large.png", { type: "image/png" }), new File(["x"], "unsafe.gif", { type: "image/gif" }), ...Array.from({ length: 4 }, (_, index) => new File(["x"], `photo-${index}.jpg`, { type: "image/jpeg" }))];
    const result = validateEvidenceFiles(files);
    expect(result.files).toHaveLength(3);
    expect(result.issues.join(" ")).toMatch(/up to 5|8 MB|JPEG, PNG, or WebP/);
  });
});
