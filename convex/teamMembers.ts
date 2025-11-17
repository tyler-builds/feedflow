import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { authComponent } from "./auth";

// Get all members of the current user's team
export const getTeamMembers = query({
  args: {},
  handler: async (ctx) => {
    console.time("getTeamMembers:getAuthUser");
    const user = await authComponent.getAuthUser(ctx);
    console.timeEnd("getTeamMembers:getAuthUser");
    if (!user) {
      throw new Error("Not authenticated");
    }

    const userId = user.userId || user._id.toString();

    // Get user's current team from settings
    console.time("getTeamMembers:getSettings");
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    console.timeEnd("getTeamMembers:getSettings");

    if (!settings) {
      throw new Error("User settings not found");
    }

    // Check if user is a member of this team
    console.time("getTeamMembers:checkMembership");
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", settings.currentTeamId).eq("userId", userId),
      )
      .first();
    console.timeEnd("getTeamMembers:checkMembership");

    if (!membership) {
      throw new Error("Not a member of this team");
    }

    // Get all team members
    console.time("getTeamMembers:fetchMembers");
    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", settings.currentTeamId))
      .collect();
    console.timeEnd("getTeamMembers:fetchMembers");

    // Get user details for each member from Better Auth
    console.time("getTeamMembers:enrichWithUserData");
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
    console.timeEnd("getTeamMembers:enrichWithUserData");

    return membersWithUserData;
  },
});

// Remove a member from the current user's team
export const removeTeamMember = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    console.time("removeTeamMember:getAuthUser");
    const user = await authComponent.getAuthUser(ctx);
    console.timeEnd("removeTeamMember:getAuthUser");
    if (!user) {
      throw new Error("Not authenticated");
    }

    const currentUserId = user.userId || user._id.toString();

    // Get user's current team from settings
    console.time("removeTeamMember:getSettings");
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", currentUserId))
      .first();
    console.timeEnd("removeTeamMember:getSettings");

    if (!settings) {
      throw new Error("User settings not found");
    }

    const teamId = settings.currentTeamId;

    // Get the team
    console.time("removeTeamMember:getTeam");
    const team = await ctx.db.get(teamId);
    console.timeEnd("removeTeamMember:getTeam");
    if (!team) {
      throw new Error("Team not found");
    }

    // Check if current user is a member
    console.time("removeTeamMember:checkCurrentUserMembership");
    const currentUserMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", teamId).eq("userId", currentUserId),
      )
      .first();
    console.timeEnd("removeTeamMember:checkCurrentUserMembership");

    if (!currentUserMembership) {
      throw new Error("Not a member of this team");
    }

    // Get the target member
    console.time("removeTeamMember:getTargetMembership");
    const targetMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", teamId).eq("userId", args.userId),
      )
      .first();
    console.timeEnd("removeTeamMember:getTargetMembership");

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

    console.time("removeTeamMember:deleteMember");
    await ctx.db.delete(targetMembership._id);
    console.timeEnd("removeTeamMember:deleteMember");

    // If the removed user had this team as their current team, switch them to a fallback
    console.time("removeTeamMember:getTargetSettings");
    const targetSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", targetMembership.userId))
      .first();
    console.timeEnd("removeTeamMember:getTargetSettings");

    if (targetSettings?.currentTeamId === teamId) {
      // Find another team membership (will always find at least their Personal team)
      console.time("removeTeamMember:findFallbackTeam");
      const fallbackMembership = await ctx.db
        .query("teamMembers")
        .withIndex("by_user", (q) => q.eq("userId", targetMembership.userId))
        .first();
      console.timeEnd("removeTeamMember:findFallbackTeam");

      if (!fallbackMembership) {
        throw new Error(
          "Cannot remove user: no fallback team found. Every user should have at least a Personal team.",
        );
      }

      console.time("removeTeamMember:updateTargetSettings");
      await ctx.db.patch(targetSettings._id, {
        currentTeamId: fallbackMembership.teamId,
        updatedAt: Date.now(),
      });
      console.timeEnd("removeTeamMember:updateTargetSettings");
    }

    return { success: true };
  },
});
