import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton, SkeletonList, SkeletonTableRows } from "./Skeleton";

describe("Skeleton", () => {
  it("sets aria-hidden to true", () => {
    render(<Skeleton />);

    const skeleton = document.querySelector("[aria-hidden='true']");
    expect(skeleton).not.toBeNull();
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
  });

  it("applies the provided className", () => {
    render(<Skeleton className="custom-skeleton" />);

    expect(document.querySelector(".custom-skeleton")).not.toBeNull();
  });
});

describe("SkeletonList", () => {
  it("renders the requested number of rows", () => {
    const { container } = render(<SkeletonList rows={4} />);

    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(4);
  });

  it("defaults to a single row", () => {
    const { container } = render(<SkeletonList />);

    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(1);
  });
});

describe("SkeletonTableRows", () => {
  it("renders rows * cols cells for the given props", () => {
    const { container } = render(<SkeletonTableRows rows={3} cols={5} />);

    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(15);
  });

  it("renders the expected number of cells for a different shape", () => {
    const { container } = render(<SkeletonTableRows rows={2} cols={4} />);

    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(8);
  });
});
