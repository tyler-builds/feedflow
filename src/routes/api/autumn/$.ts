import { createFileRoute } from "@tanstack/react-router";
import { autumnHandler } from "autumn-js/backend";
import { fetchSession } from "@convex-dev/better-auth/react-start";
import { fetchQuery } from "@/lib/auth-server";
import { api } from "../../../../convex/_generated/api";

export const Route = createFileRoute("/api/autumn/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return handleAutumnRequest(request);
      },
      POST: async ({ request }) => {
        return handleAutumnRequest(request);
      },
      PUT: async ({ request }) => {
        return handleAutumnRequest(request);
      },
      PATCH: async ({ request }) => {
        return handleAutumnRequest(request);
      },
      DELETE: async ({ request }) => {
        return handleAutumnRequest(request);
      },
    },
  },
});

async function handleAutumnRequest(request: Request) {
  // Get the session
  const { session } = await fetchSession(request);

  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get the current team for the user using the auth-server helper
  const currentTeam = await fetchQuery(api.userSettings.getCurrentTeam, {});

  let body = null;
  if (request.method !== "GET") {
    body = await request.json();
  }

  const { statusCode, response } = await autumnHandler({
    customerId: currentTeam._id,
    customerData: {
      name: currentTeam.name,
      email: session.user.email || "",
    },
    request: {
      url: request.url,
      method: request.method,
      body: body,
    },
  });

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });
}
