import { render } from "@testing-library/react";
import axe from "axe-core";
import PilotPage from "./page";

describe("pilot release accessibility boundary", () => {
  it("has no automatically detectable WCAG A/AA violations", async () => {
    const { container } = render(<PilotPage />);
    const result = await axe.run(container, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, rules: { "color-contrast": { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
});