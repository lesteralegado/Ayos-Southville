import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomePage from "./page";

describe("public pilot directory", () => {
  beforeEach(() => localStorage.clear());

  it("explains the pilot and lists privacy-safe community reports", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: /small reports\. visible progress\./i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/resident-led pilot/i)).toHaveLength(2);
    expect(screen.getByText(/blocked drainage/i)).toBeInTheDocument();
    expect(screen.getByText(/phase 2/i)).toBeInTheDocument();

    expect(screen.queryByText(/reporter@example\.com/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/block 11, lot 4/i)).not.toBeInTheDocument();
  });

  it("switches to Filipino and restores the preference on a return visit", async () => {
    const user = userEvent.setup();
    const firstVisit = render(<HomePage />);

    await user.click(screen.getByRole("button", { name: /filipino/i }));
    expect(screen.getByRole("link", { name: /mga ulat sa komunidad/i })).toBeInTheDocument();

    firstVisit.unmount();
    render(<HomePage />);

    expect(screen.getByRole("link", { name: /mga ulat sa komunidad/i })).toBeInTheDocument();
  });
});
