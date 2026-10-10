// @vitest-environment node
import { beforeEach, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  resident: vi.fn(),
  access: vi.fn(),
  upload: vi.fn(),
  list: vi.fn(),
}));
vi.mock("@/features/auth/session", () => ({
  getVerifiedResident: mocks.resident,
  hasPilotAccess: mocks.access,
}));
vi.mock("@/features/reports/firebase-evidence-store", () => ({
  getEvidenceModule: () => ({ upload: mocks.upload, list: mocks.list }),
}));
import { GET, POST } from "./route";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.resident.mockResolvedValue({ uid: "r1" });
  mocks.access.mockResolvedValue(true);
});
it("denies unapproved upload before reading the file", async () => {
  mocks.access.mockResolvedValue(false);
  const response = await POST(
    new Request("https://ayos.test/api/evidence", {
      method: "POST",
      headers: { origin: "https://ayos.test" },
    }),
  );
  expect(response.status).toBe(403);
  expect(mocks.upload).not.toHaveBeenCalled();
});
it("recovers only the authenticated residents draft uploads", async () => {
  mocks.list.mockResolvedValue([{ id: "photo1", visibility: "restricted" }]);
  const response = await GET(
    new Request("https://ayos.test/api/evidence?draftKey=draft-key-12345"),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(mocks.list).toHaveBeenCalledWith("r1", "draft-key-12345");
});
it("does not claim success when private storage fails", async () => {
  mocks.list.mockRejectedValue(new Error("private credential must not leak"));
  const response = await GET(
    new Request("https://ayos.test/api/evidence?draftKey=draft-key-12345"),
  );
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("credential");
});
it("uploads actual bounded bytes with the authenticated identity", async () => {
  mocks.upload.mockResolvedValue({
    id: "confirmed-photo",
    visibility: "restricted",
  });
  const body = new FormData();
  body.set("draftKey", "draft-key-12345");
  body.set("slotId", "photo-slot-1234");
  body.set(
    "photo",
    new Blob([new Uint8Array([255, 216, 255])], { type: "image/jpeg" }),
    "private-home.jpg",
  );
  const response = await POST(
    new Request("https://ayos.test/api/evidence", {
      method: "POST",
      headers: { origin: "https://ayos.test" },
      body,
    }),
  );
  expect(response.status).toBe(201);
  expect(mocks.upload).toHaveBeenCalledWith(
    expect.objectContaining({
      residentUid: "r1",
      bytes: new Uint8Array([255, 216, 255]),
      draftKey: "draft-key-12345",
    }),
  );
  expect(await response.json()).toEqual({
    asset: { id: "confirmed-photo", visibility: "restricted" },
  });
});
