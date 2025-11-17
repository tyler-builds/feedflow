import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// Helper function to generate URL-friendly slug from team name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Create a new team
export const createTeam = mutation({
  args: {
    name: v.string(),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.time("createTeam:getAuthUser");
    const user = await authComponent.getAuthUser(ctx);
    console.timeEnd("createTeam:getAuthUser");
    if (!user) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    let slug = generateSlug(args.name);

    // Ensure slug is unique by appending timestamp if needed
    console.time("createTeam:checkSlugUniqueness");
    const existing = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    console.timeEnd("createTeam:checkSlugUniqueness");

    if (existing) {
      slug = `${slug}-${now}`;
    }

    // Create the team
    console.time("createTeam:insertTeam");
    const teamId = await ctx.db.insert("teams", {
      name: args.name,
      slug,
      logoUrl: args.logoUrl,
      ownerId: user.userId || user._id.toString(),
      createdAt: now,
      updatedAt: now,
    });
    console.timeEnd("createTeam:insertTeam");

    // Add creator as owner
    console.time("createTeam:addOwnerMember");
    await ctx.db.insert("teamMembers", {
      teamId,
      userId: user.userId || user._id.toString(),
      role: "owner",
      joinedAt: now,
    });
    console.timeEnd("createTeam:addOwnerMember");

    return teamId;
  },
});

// Get all teams the current user belongs to
export const getUserTeams = query({
  args: {},
  handler: async (ctx) => {
    console.time("getUserTeams:getAuthUser");
    const user = await authComponent.getAuthUser(ctx);
    console.timeEnd("getUserTeams:getAuthUser");
    if (!user) {
      return [];
    }

    // Get all team memberships for this user
    console.time("getUserTeams:fetchMemberships");
    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) =>
        q.eq("userId", user.userId || user._id.toString()),
      )
      .collect();
    console.timeEnd("getUserTeams:fetchMemberships");

    // Batch fetch team details for all memberships
    console.time("getUserTeams:enrichWithTeamData");
    const teamIds = memberships.map((m) => m.teamId);
    const teamsList = await Promise.all(teamIds.map((id) => ctx.db.get(id)));
    const teamsMap = new Map(teamIds.map((id, i) => [id, teamsList[i]]));

    // Enrich memberships with team data from the map (no additional queries)
    const teams = memberships.map((membership) => {
      const team = teamsMap.get(membership.teamId);
      if (!team) return null;

      return {
        ...team,
        role: membership.role,
        joinedAt: membership.joinedAt,
      };
    });
    console.timeEnd("getUserTeams:enrichWithTeamData");

    // Filter out any null values and sort by most recently joined
    return teams
      .filter((team) => team !== null)
      .sort((a, b) => b.joinedAt - a.joinedAt);
  },
});

// Get a specific team by ID
export const getTeamById = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    console.time("getTeamById:getAuthUser");
    const user = await authComponent.getAuthUser(ctx);
    console.timeEnd("getTeamById:getAuthUser");
    if (!user) {
      throw new Error("Not authenticated");
    }

    console.time("getTeamById:getTeam");
    const team = await ctx.db.get(args.teamId);
    console.timeEnd("getTeamById:getTeam");
    if (!team) {
      throw new Error("Team not found");
    }

    // Check if user is a member
    console.time("getTeamById:checkMembership");
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q
          .eq("teamId", args.teamId)
          .eq("userId", user.userId || user._id.toString()),
      )
      .first();
    console.timeEnd("getTeamById:checkMembership");

    if (!membership) {
      throw new Error("Not a member of this team");
    }

    // Get member count
    console.time("getTeamById:countMembers");
    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
    console.timeEnd("getTeamById:countMembers");

    return {
      ...team,
      role: membership.role,
      memberCount: members.length,
    };
  },
});

// Update team information
export const updateTeam = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.time("updateTeam:getAuthUser");
    const user = await authComponent.getAuthUser(ctx);
    console.timeEnd("updateTeam:getAuthUser");
    if (!user) {
      throw new Error("Not authenticated");
    }

    console.time("updateTeam:getTeam");
    const team = await ctx.db.get(args.teamId);
    console.timeEnd("updateTeam:getTeam");
    if (!team) {
      throw new Error("Team not found");
    }

    // Check if user is a member (in the future, check for admin/owner role)
    console.time("updateTeam:checkMembership");
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q
          .eq("teamId", args.teamId)
          .eq("userId", user.userId || user._id.toString()),
      )
      .first();
    console.timeEnd("updateTeam:checkMembership");

    if (!membership) {
      throw new Error("Not a member of this team");
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Insufficient permissions");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name;
      const newSlug = generateSlug(args.name);
      console.time("updateTeam:checkSlugCollision");
      const slugCollision = await ctx.db
        .query("teams")
        .withIndex("by_slug", (q) => q.eq("slug", newSlug))
        .first();
      console.timeEnd("updateTeam:checkSlugCollision");
      updates.slug =
        slugCollision && slugCollision._id !== args.teamId
          ? `${newSlug}-${Date.now()}`
          : newSlug;
    }

    if (args.logoUrl !== undefined) {
      updates.logoUrl = args.logoUrl;
    }

    console.time("updateTeam:patchTeam");
    await ctx.db.patch(args.teamId, updates);
    console.timeEnd("updateTeam:patchTeam");

    return args.teamId;
  },
});
