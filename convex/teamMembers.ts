import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { authComponent } from "./auth";

// Get all members of the current user's team
export const getTeamMembers = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const userId = user.userId || user._id.toString();

    // Get user's current team from settings
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!settings) {
      throw new Error("User settings not found");
    }

    // Check if user is a member of this team
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", settings.currentTeamId).eq("userId", userId),
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this team");
    }

    // Get all team members
    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", settings.currentTeamId))
      .collect();

    // Get user details for each member from Better Auth
    const membersWithUserData = await Promise.all(
      members.map(async (member) => {
        const user = await authComponent.getAnyUserById(ctx, member.userId);
        return {
          userId: member.userId,
          role: member.role,
          joinedAt: member.joinedAt,
          _id: member._id,
          name: user?.name || null,
          email: user?.email || null,
          image: user?.image || null,
        };
      }),
    );

    return membersWithUserData;
  },
});

// Remove a member from the current user's team
export const removeTeamMember = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const currentUserId = user.userId || user._id.toString();

    // Get user's current team from settings
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", currentUserId))
      .first();

    if (!settings) {
      throw new Error("User settings not found");
    }

    const teamId = settings.currentTeamId;

    // Get the team
    const team = await ctx.db.get(teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    // Check if current user is a member
    const currentUserMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", teamId).eq("userId", currentUserId),
      )
      .first();

    if (!currentUserMembership) {
      throw new Error("Not a member of this team");
    }

    // Get the target member
    const targetMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", teamId).eq("userId", args.userId),
      )
      .first();

    if (!targetMembership) {
      throw new Error("User is not a member of this team");
    }

    // Cannot remove the owner
    if (
      targetMembership.role === "owner" ||
      team.ownerId === targetMembership.userId
    ) {
      throw new Error("Cannot remove the team owner");
    }

    // Check if current user has permission to remove members
    if (
      currentUserMembership.role !== "owner" &&
      currentUserMembership.role !== "admin"
    ) {
      throw new Error("Insufficient permissions");
    }

    await ctx.db.delete(targetMembership._id);

    return { success: true };
  },
});
