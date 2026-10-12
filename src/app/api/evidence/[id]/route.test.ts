import { beforeEach, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  resident: vi.fn(),
  operator: vi.fn(),
  access: vi.fn(),
  read: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/features/auth/session", () => ({
  getVerifiedResident: mocks.resident,
  getVerifiedOperator: mocks.operator,
  hasPilotEligibility: mocks.access,
}));
vi.mock("@/features/reports/firebase-evidence-store", () => ({
  getEvidenceModule: () => ({ read: mocks.read, remove: mocks.remove }),
}));
import { GET, DELETE } from "./route";
const context = { params: Promise.resolve({ id: "private-photo" }) };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.resident.mockResolvedValue({ uid: "r1" });
  mocks.operator.mockResolvedValue({ uid: "r1", roles: ["Resident"] });
  mocks.access.mockResolvedValue(true);
});
it("does not expose private file bytes without a verified account", async () => {
  mocks.resident.mockResolvedValue(null);
  expect(
    (
      await GET(
        new Request("https://ayos.test/api/evidence/private-photo"),
        context,
      )
    ).status,
  ).toBe(401);
  expect(mocks.read).not.toHaveBeenCalled();
});
it("returns owned private bytes without a public cache or storage URL", async () => {
  mocks.read.mockResolvedValue({
    bytes: new Uint8Array([255, 216, 255]),
    type: "image/jpeg",
  });
  const response = await GET(
    new Request("https://ayos.test/api/evidence/private-photo"),
    context,
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(
    new Uint8Array([255, 216, 255]),
  );
  expect(mocks.read).toHaveBeenCalledWith("r1", "private-photo", false);
});
it("denies cross-origin private-file removal", async () => {
  const response = await DELETE(
    new Request("https://ayos.test/api/evidence/private-photo", {
      method: "DELETE",
      headers: { origin: "https://evil.test" },
    }),
    context,
  );
  expect(response.status).toBe(403);
  expect(mocks.remove).not.toHaveBeenCalled();
});
