import {
  createClient,
  type GenericCtx,
  type AuthFunctions,
} from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components, internal } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";

const siteUrl = process.env.SITE_URL;
if (!siteUrl) {
  throw new Error(
    "SITE_URL environment variable is required for authentication",
  );
}

const authFunctions: AuthFunctions = internal.auth;

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {
    user: {
      onCreate: async (ctx, authUser) => {
        console.log("🎉 User onCreate trigger fired!", authUser._id);

        // Create a "Personal" team for every new user
        const now = Date.now();
        const teamName = "Personal";
        const slug = `personal-${now}`;

        // Get the userId as a string (Better Auth users have _id as the primary identifier)
        const userId = authUser._id.toString();
        console.log("Creating team for userId:", userId);

        // Create the personal team
        const teamId = await ctx.db.insert("teams", {
          name: teamName,
          slug,
          ownerId: userId,
          createdAt: now,
          updatedAt: now,
        });

        // Add user as owner
        await ctx.db.insert("teamMembers", {
          teamId,
          userId: userId,
          role: "owner",
          joinedAt: now,
        });

        // Initialize user settings with this team as the current team
        await ctx.db.insert("userSettings", {
          userId: userId,
          currentTeamId: teamId,
          updatedAt: now,
        });
      },
    },
  },
});

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    // disable logging when createAuth is called just to generate options.
    // this is not required, but there's a lot of noise in logs without it.
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    // Configure simple, non-verified email/password to get started
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      // The Convex plugin is required for Convex compatibility
      convex(),
    ],
  });
};

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});
