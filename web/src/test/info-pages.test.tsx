import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";

describe("Merged info pages", () => {
  for (const path of ["/about", "/contact", "/developers", "/faq", "/features", "/bookmarklet", "/tutorials"]) {
    it(`has a page at ${path}`, () => {
      const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
      expect(router.matchRoutes(path).at(-1)?.routeId).toBe(path);
    });
  }
});
