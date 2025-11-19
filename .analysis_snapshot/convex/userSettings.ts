import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { authComponent } from "./auth";

// Get or create user settings
async function getOrCreateSettings(ctx: any, userId: string) {
  console.time("getOrCreateSettings:querySettings");
  let settings = await ctx.db
    .query("userSettings")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  console.timeEnd("getOrCreateSettings:querySettings");

  if (!settings) {
    // Create default settings if they don't exist
    console.time("getOrCreateSettings:createSettings");
    const settingsId = await ctx.db.insert("userSettings", {
      userId,
      updatedAt: Date.now(),
    });
    settings = await ctx.db.get(settingsId);
    console.timeEnd("getOrCreateSettings:createSettings");
  }

  return settings;
}

// Internal query to get current team (skips auth, for use by actions that already authenticated)
export const _getCurrentTeamInternal = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user settings (every user should have settings with a currentTeamId)
    console.time("_getCurrentTeamInternal:getSettings");
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    console.timeEnd("_getCurrentTeamInternal:getSettings");

    if (!settings) {
      throw new Error("User settings not found");
    }

    // Get the current team
    console.time("_getCurrentTeamInternal:getTeam");
    const team = await ctx.db.get(settings.currentTeamId);
    console.timeEnd("_getCurrentTeamInternal:getTeam");
    if (!team) {
      throw new Error("Current team not found");
    }

    // Get user's role in this team
    console.time("_getCurrentTeamInternal:getMembership");
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", settings.currentTeamId).eq("userId", args.userId),
      )
      .first();
    console.timeEnd("_getCurrentTeamInternal:getMembership");

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

// Get the current team for the authenticated user
export const getCurrentTeam = query({
  args: {},
  handler: async (ctx) => {
    console.time("getCurrentTeam:getAuthUser");
    const user = await authComponent.getAuthUser(ctx);
    console.timeEnd("getCurrentTeam:getAuthUser");
    if (!user) {
      throw new Error("Not authenticated");
    }

    const userId = user.userId || user._id.toString();

    // Get user settings (every user should have settings with a currentTeamId)
    console.time("getCurrentTeam:getSettings");
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    console.timeEnd("getCurrentTeam:getSettings");

    if (!settings) {
      throw new Error("User settings not found");
    }

    // Get the current team
    console.time("getCurrentTeam:getTeam");
    const team = await ctx.db.get(settings.currentTeamId);
    console.timeEnd("getCurrentTeam:getTeam");
    if (!team) {
      throw new Error("Current team not found");
    }

    // Get user's role in this team
    console.time("getCurrentTeam:getMembership");
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", settings.currentTeamId).eq("userId", userId),
      )
      .first();
    console.timeEnd("getCurrentTeam:getMembership");

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
    console.time("setCurrentTeam:getAuthUser");
    const user = await authComponent.getAuthUser(ctx);
    console.timeEnd("setCurrentTeam:getAuthUser");
    if (!user) {
      throw new Error("Not authenticated");
    }

    const userId = user.userId || user._id.toString();

    // Verify user is a member of this team
    console.time("setCurrentTeam:checkMembership");
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", args.teamId).eq("userId", userId),
      )
      .first();
    console.timeEnd("setCurrentTeam:checkMembership");

    if (!membership) {
      throw new Error("Not a member of this team");
    }

    // Get or create settings
    const settings = await getOrCreateSettings(ctx, userId);

    // Update current team
    console.time("setCurrentTeam:updateSettings");
    await ctx.db.patch(settings._id, {
      currentTeamId: args.teamId,
      updatedAt: Date.now(),
    });
    console.timeEnd("setCurrentTeam:updateSettings");

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
    console.time("initializeUserSettings:checkExisting");
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    console.timeEnd("initializeUserSettings:checkExisting");

    if (existing) {
      // Update with the provided team
      console.time("initializeUserSettings:updateExisting");
      await ctx.db.patch(existing._id, {
        currentTeamId: args.currentTeamId,
        updatedAt: Date.now(),
      });
      console.timeEnd("initializeUserSettings:updateExisting");
      return existing._id;
    }

    // Create new settings
    console.time("initializeUserSettings:createNew");
    const settingsId = await ctx.db.insert("userSettings", {
      userId: args.userId,
      currentTeamId: args.currentTeamId,
      updatedAt: Date.now(),
    });
    console.timeEnd("initializeUserSettings:createNew");
    return settingsId;
  },
});
