import { expect, it } from "vitest";
import { createMutationProtection, readBoundedJson } from "./security-module";

it("limits sensitive operations across service instances and permits the next window", async () => {
  let time = new Date("2026-10-11T00:00:00Z");
  const windows = new Map<string, number>();
  const consume = async (key: string, limit: number) => {
    const count = (windows.get(key) ?? 0) + 1;
    if (count > limit) return false;
    windows.set(key, count); return true;
  };
  const service = () => createMutationProtection({ consume, now: () => time });
  for (let index = 0; index < 10; index++) await service().check("resident", "report");
  await expect(service().check("resident", "report")).rejects.toMatchObject({ status: 429, code: "RATE_LIMIT" });
  await service().check("another-resident", "report");
  time = new Date("2026-10-11T01:00:00Z");
  await service().check("resident", "report");
});

it("bounds streamed JSON even when Content-Length is absent or dishonest", async () => {
  const request = new Request("https://ayos.test", { method: "POST", body: JSON.stringify({ private: "x".repeat(50000) }) });
  await expect(readBoundedJson(request)).rejects.toMatchObject({ status: 413, code: "TOO_LARGE" });
});
