import { render } from "@testing-library/react";
import { expectAccessible } from "@/test/accessibility";
import PilotPage from "./page";

describe("pilot release accessibility boundary", () => {
  const errors = vi.spyOn(console, "error");
  afterEach(() => { expect(errors.mock.calls).toEqual([]); errors.mockClear(); });
  it("has no automatically detectable WCAG A/AA violations", async () => {
    const { container } = render(<PilotPage />);
    await expectAccessible(container);
  });
});
