import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TutorialGrid, TutorialShowcase, formatDuration, formatMonth, formatViews, isNew, pickFeatured, sortTutorials, type Tutorial } from "@/components/tutorial-grid";

const video = (over: Partial<Tutorial>): Tutorial => ({ id: "aaaaaaaaaaa", title: "A", channel: "Chan", publishedAt: "2020-01-01", durationSeconds: 60, views: 10, firstSeen: "2026-10-26", ...over });

describe("tutorial formatting", () => {
  it("formats durations, views and months", () => {
    expect(formatDuration(604)).toBe("10:04");
    expect(formatDuration(3723)).toBe("1:02:03");
    expect(formatDuration(32)).toBe("0:32");
    expect(formatViews(9208)).toBe("9.2K views");
    expect(formatViews(1)).toBe("1 view");
    expect(formatViews(1_200_000)).toBe("1.2M views");
    expect(formatMonth("2018-03-11")).toBe("Mar 2018");
    expect(formatMonth(null)).toBe("");
  });

  it("flags videos published in the 90 days before the list was updated", () => {
    expect(isNew(video({ publishedAt: "2026-10-01" }), "2026-10-26T00:00:00Z")).toBe(true);
    expect(isNew(video({ publishedAt: "2026-06-01" }), "2026-10-26T00:00:00Z")).toBe(false);
    expect(isNew(video({ publishedAt: null }), "2026-10-26T00:00:00Z")).toBe(false);
  });

  it("sorts newest first or by views", () => {
    const list = [video({ id: "old", publishedAt: "2015-01-01", views: 900 }), video({ id: "new", publishedAt: "2023-01-01", views: 5 })];
    expect(sortTutorials(list, "newest").map(v => v.id)).toEqual(["new", "old"]);
    expect(sortTutorials(list, "popular").map(v => v.id)).toEqual(["old", "new"]);
  });
});

describe("pickFeatured", () => {
  const list = [
    video({ id: "rex1", channel: "Rexburg", views: 5000 }),
    video({ id: "rex2", channel: "Rexburg", views: 4000 }),
    video({ id: "byu1", channel: "BYU", views: 9000 }),
    video({ id: "carol", channel: "Carol", views: 300 }),
    video({ id: "tiny", channel: "Tiny", views: 2 }),
  ];

  it("takes the most watched video per channel first", () => {
    expect(pickFeatured(list, 3).map(v => v.id)).toEqual(["byu1", "rex1", "carol"]);
  });

  it("fills remaining slots from the same channels when there are not enough channels", () => {
    expect(pickFeatured(list.slice(0, 3), 3).map(v => v.id)).toEqual(["byu1", "rex1", "rex2"]);
    expect(pickFeatured([], 3)).toEqual([]);
  });
});

describe("TutorialShowcase", () => {
  it("renders the given videos with h3 titles and plays inline", () => {
    render(<TutorialShowcase tutorials={[video({ id: "byu00000000", title: "BYU talk", views: 9000 })]} asOf="2026-10-26T00:00:00Z" />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("BYU talk");
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Play BYU talk" }));
    expect(document.querySelector("iframe")?.getAttribute("src")).toContain("embed/byu00000000");
  });
});

describe("TutorialGrid", () => {
  const list = [
    video({ id: "old00000000", title: "Old video", publishedAt: "2015-01-01", views: 900 }),
    video({ id: "new00000000", title: "New video", publishedAt: "2023-01-01", views: 5 }),
  ];

  it("re-sorts on Most watched and plays a video inline on click", () => {
    render(<TutorialGrid tutorials={list} asOf="2026-10-26T00:00:00Z" />);
    const titles = () => screen.getAllByRole("heading", { level: 2 }).map(h => h.textContent);
    expect(titles()).toEqual(["New video", "Old video"]);
    expect(screen.getByText("2 videos from 1 channels")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Most watched" }));
    expect(titles()).toEqual(["Old video", "New video"]);

    expect(document.querySelector("iframe")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Play Old video" }));
    const frame = document.querySelector("iframe");
    expect(frame?.getAttribute("src")).toContain("youtube-nocookie.com/embed/old00000000");
    expect(frame?.getAttribute("title")).toBe("Old video");
    expect(screen.getByRole("button", { name: "Play New video" })).toBeInTheDocument();
  });
});
