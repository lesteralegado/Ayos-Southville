import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OperatorUpdateFields } from "./operator-update-fields";
it.each(["English update", "Filipino update"])("allows %s without requiring the other language", async label => {
  render(<form><OperatorUpdateFields locale="en" labels={{ english: "English update", filipino: "Filipino update" }} /></form>);
  expect(screen.getByLabelText(label).closest("form")?.checkValidity()).toBe(false);
  await userEvent.type(screen.getByLabelText(label), "Synthetic update.");
  expect(screen.getByLabelText(label).closest("form")?.checkValidity()).toBe(true);
  expect(screen.getByLabelText(label)).toHaveAttribute("maxlength", "1000");
});
