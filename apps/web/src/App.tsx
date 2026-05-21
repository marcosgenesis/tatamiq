import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { api } from "./api";
import "./index.css";

const queryClient = new QueryClient();

function StatusPage() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const { data, error } = await api.GET("/health");
      if (error) throw error;
      return data;
    },
  });

  const academyQuery = useQuery({
    queryKey: ["academies", "demo"],
    queryFn: async () => {
      const { data, error } = await api.GET("/academies/demo");
      if (error) throw error;
      return data;
    },
  });

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-50">
      <section className="mx-auto max-w-3xl rounded-3xl border border-zinc-800 bg-zinc-900/70 p-8 shadow-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.35em] text-cyan-300">Tatamiq</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">V0 scaffold</h1>
        <p className="mt-3 text-zinc-300">
          Vite, React, TanStack Query, OpenAPI client, NestJS and Drizzle are wired together.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <StatusCard
            label="API health"
            loading={healthQuery.isLoading}
            error={healthQuery.error}
            value={healthQuery.data?.status ?? "Unavailable"}
            detail={healthQuery.data?.timestamp}
          />
          <StatusCard
            label="Demo academy"
            loading={academyQuery.isLoading}
            error={academyQuery.error}
            value={academyQuery.data?.name ?? "Unavailable"}
            detail={academyQuery.data?.id}
          />
        </div>
      </section>
    </main>
  );
}

function StatusCard(props: {
  label: string;
  loading: boolean;
  error: Error | null;
  value: string;
  detail?: string | undefined;
}) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
      <h2 className="text-sm font-medium text-zinc-400">{props.label}</h2>
      <p className="mt-3 text-2xl font-semibold">
        {props.loading ? "Loading…" : props.error ? "Error" : props.value}
      </p>
      {props.detail ? <p className="mt-2 break-all text-xs text-zinc-500">{props.detail}</p> : null}
    </article>
  );
}

const rootRoute = createRootRoute({ component: StatusPage });
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: StatusPage,
});
const router = createRouter({ routeTree: rootRoute.addChildren([indexRoute]) });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
