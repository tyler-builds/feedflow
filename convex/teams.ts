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
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    let slug = generateSlug(args.name);

    // Ensure slug is unique by appending timestamp if needed
    const existing = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (existing) {
      slug = `${slug}-${now}`;
    }

    // Create the team
    const teamId = await ctx.db.insert("teams", {
      name: args.name,
      slug,
      logoUrl: args.logoUrl,
      ownerId: user.userId || user._id.toString(),
      createdAt: now,
      updatedAt: now,
    });

    // Add creator as owner
    await ctx.db.insert("teamMembers", {
      teamId,
      userId: user.userId || user._id.toString(),
      role: "owner",
      joinedAt: now,
    });

    return teamId;
  },
});

// Get all teams the current user belongs to
export const getUserTeams = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return [];
    }

    // Get all team memberships for this user
    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) =>
        q.eq("userId", user.userId || user._id.toString()),
      )
      .collect();

    // Get team details for each membership
    const teams = await Promise.all(
      memberships.map(async (membership) => {
        const team = await ctx.db.get(membership.teamId);
        if (!team) return null;

        return {
          ...team,
          role: membership.role,
          joinedAt: membership.joinedAt,
        };
      }),
    );

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
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const team = await ctx.db.get(args.teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    // Check if user is a member
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q
          .eq("teamId", args.teamId)
          .eq("userId", user.userId || user._id.toString()),
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this team");
    }

    // Get member count
    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

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
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const team = await ctx.db.get(args.teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    // Check if user is a member (in the future, check for admin/owner role)
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q
          .eq("teamId", args.teamId)
          .eq("userId", user.userId || user._id.toString()),
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this team");
    }

    // Future: Check if user has permission to update
    // if (membership.role !== "owner" && membership.role !== "admin") {
    //   throw new Error("Insufficient permissions");
    // }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name;
      updates.slug = generateSlug(args.name);
    }

    if (args.logoUrl !== undefined) {
      updates.logoUrl = args.logoUrl;
    }

    await ctx.db.patch(args.teamId, updates);

    return args.teamId;
  },
});
