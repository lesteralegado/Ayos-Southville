import { beforeEach, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  resident: vi.fn(),
  access: vi.fn(),
  suggestions: vi.fn(),
}));
vi.mock("@/features/auth/session", () => ({
  getVerifiedResident: mocks.resident,
  hasPilotAccess: mocks.access,
}));
vi.mock("@/features/reports/firebase-engagement-store", () => ({
  getEngagementModule: () => ({ suggestDuplicates: mocks.suggestions }),
}));
vi.mock("@/features/admin/firebase-administration-store", () => ({
  getPublicPilotConfiguration: async () => ({
    categories: [{ id: "streetlights", active: true }],
  }),
}));
import { POST } from "./route";
const request = (input: unknown) =>
  new Request("https://ayos.test/api/reports/suggestions", {
    method: "POST",
    headers: {
      origin: "https://ayos.test",
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.resident.mockResolvedValue({ uid: "r1" });
  mocks.access.mockResolvedValue(true);
});
it("denies an unapproved resident and invalid coordinates", async () => {
  mocks.access.mockResolvedValue(false);
  expect(
    (
      await POST(
        request({
          category: "streetlights",
          latitude: 14.28,
          longitude: 121.13,
        }),
      )
    ).status,
  ).toBe(403);
  mocks.access.mockResolvedValue(true);
  expect(
    (
      await POST(
        request({ category: "streetlights", latitude: 91, longitude: 121.13 }),
      )
    ).status,
  ).toBe(422);
  expect(mocks.suggestions).not.toHaveBeenCalled();
});
it("returns privacy-safe suggestions with no cache", async () => {
  mocks.suggestions.mockResolvedValue([{ reference: "AS-123456" }]);
  const response = await POST(
    request({ category: "streetlights", latitude: 14.28, longitude: 121.13 }),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({
    suggestions: [{ reference: "AS-123456" }],
  });
});
