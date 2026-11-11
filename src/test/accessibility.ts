import { act } from "@testing-library/react";
import axe from "axe-core";

/** DOM semantics only: canvas/font metrics and contrast require browser verification. */
export async function expectAccessible(container: HTMLElement) {
  await act(async () => {
    const result = await axe.run(container, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
      rules: {
        "color-contrast": { enabled: false },
        "label-content-name-mismatch": { enabled: false },
      },
    });
    expect(result.violations).toEqual([]);
  });
}
