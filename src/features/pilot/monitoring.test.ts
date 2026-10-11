import { expect, it } from "vitest";
import { createOperationalMonitor } from "./monitoring";
it("emits only allowlisted operational fields, never private payloads or arbitrary error messages", () => {
  const events: unknown[] = [];
  const monitor = createOperationalMonitor(event => events.push(event));
  monitor.record({ operation: "retention", status: 503, code: "UNAVAILABLE", durationMs: 10, email: "private@example.test", description: "Private household", latitude: 14.123456, error: new Error("private identity") });
  expect(events).toEqual([{ operation: "retention", status: 503, code: "UNAVAILABLE", durationMs: 10 }]);
});
