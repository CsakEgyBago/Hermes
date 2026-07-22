import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Collapsible } from "./Collapsible";

describe("Collapsible", () => {
  it("hides children when closed", () => {
    render(
      <Collapsible title="Details" open={false} onToggle={vi.fn()}>
        <p>Hidden content</p>
      </Collapsible>,
    );
    expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /details/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("shows children when open", () => {
    render(
      <Collapsible title="Details" open={true} onToggle={vi.fn()}>
        <p>Visible content</p>
      </Collapsible>,
    );
    expect(screen.getByText("Visible content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /details/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("calls onToggle when the header is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <Collapsible title="Details" open={false} onToggle={onToggle}>
        <p>Content</p>
      </Collapsible>,
    );
    await userEvent.click(screen.getByRole("button", { name: /details/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
