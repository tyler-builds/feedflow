import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// Get or create user settings
async function getOrCreateSettings(ctx: any, userId: string) {
  let settings = await ctx.db
    .query("userSettings")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (!settings) {
    // Create default settings if they don't exist
    const settingsId = await ctx.db.insert("userSettings", {
      userId,
      updatedAt: Date.now(),
    });
    settings = await ctx.db.get(settingsId);
  }

  return settings;
}

// Get the current team for the authenticated user
export const getCurrentTeam = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const userId = user.userId || user._id.toString();

    // Get user settings (every user should have settings with a currentTeamId)
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!settings) {
      throw new Error("User settings not found");
    }

    // Get the current team
    const team = await ctx.db.get(settings.currentTeamId);
    if (!team) {
      throw new Error("Current team not found");
    }

    // Get user's role in this team
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", settings.currentTeamId).eq("userId", userId),
      )
      .first();

    if (!membership) {
      throw new Error("User is not a member of the current team");
    }

    return {
      ...team,
      role: membership.role,
      joinedAt: membership.joinedAt,
    };
  },
});

// Get user settings
export const getUserSettings = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return null;
    }

    const userId = user.userId || user._id.toString();
    return await getOrCreateSettings(ctx, userId);
  },
});

// Set the current team
export const setCurrentTeam = mutation({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const userId = user.userId || user._id.toString();

    // Verify user is a member of this team
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", args.teamId).eq("userId", userId),
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this team");
    }

    // Get or create settings
    const settings = await getOrCreateSettings(ctx, userId);

    // Update current team
    await ctx.db.patch(settings._id, {
      currentTeamId: args.teamId,
      updatedAt: Date.now(),
    });

    return args.teamId;
  },
});

// Initialize user settings (to be called after user creation)
export const initializeUserSettings = mutation({
  args: {
    userId: v.string(),
    currentTeamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    // Check if settings already exist
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      // Update with the provided team
      await ctx.db.patch(existing._id, {
        currentTeamId: args.currentTeamId,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new settings
    return await ctx.db.insert("userSettings", {
      userId: args.userId,
      currentTeamId: args.currentTeamId,
      updatedAt: Date.now(),
    });
  },
});
