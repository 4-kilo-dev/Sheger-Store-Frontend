import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes: keep data fresh and avoid redundant refetching
        gcTime: 1000 * 60 * 30, // 30 minutes: garbage collect cached queries
        refetchOnWindowFocus: false, // Don't refetch when clicking back onto the browser tab
        retry: 1, // Only retry failed requests once
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
