import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// Create a new invitation
export const createInvitation = mutation({
  args: {
    teamId: v.id("teams"),
    email: v.string(),
    role: v.optional(
      v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    ),
  },
  handler: async (ctx, args) => {
    console.time("createInvitation:getAuthUser");
    const user = await authComponent.getAuthUser(ctx);
    console.timeEnd("createInvitation:getAuthUser");
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Check if current user is a member of the team
    console.time("createInvitation:checkMembership");
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q
          .eq("teamId", args.teamId)
          .eq("userId", user.userId || user._id.toString()),
      )
      .first();
    console.timeEnd("createInvitation:checkMembership");

    if (!membership) {
      throw new Error("Not a member of this team");
    }

    const normalizedEmail = args.email.toLowerCase();

    // Check if there's already a pending invitation for this email
    console.time("createInvitation:checkExisting");
    const existingInvitation = await ctx.db
      .query("teamInvitations")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("email"), normalizedEmail))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();
    console.timeEnd("createInvitation:checkExisting");

    if (existingInvitation) {
      throw new Error("An invitation has already been sent to this email");
    }

    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    // Generate a secure random token
    const token = crypto.randomUUID();

    console.time("createInvitation:insertInvitation");
    const invitationId = await ctx.db.insert("teamInvitations", {
      teamId: args.teamId,
      email: normalizedEmail,
      invitedBy: user.userId || user._id.toString(),
      status: "pending",
      role: args.role || "member",
      token,
      expiresAt: now + sevenDays,
      createdAt: now,
    });
    console.timeEnd("createInvitation:insertInvitation");

    return invitationId;
  },
});

// Get pending invitations for the current user's email
export const getUserInvitations = query({
  args: {},
  handler: async (ctx) => {
    console.time("getUserInvitations:getAuthUser");
    const user = await authComponent.getAuthUser(ctx);
    console.timeEnd("getUserInvitations:getAuthUser");
    if (!user) {
      return [];
    }

    // Get user's email from Better Auth
    const email = user.email?.toLowerCase();
    if (!email) {
      return [];
    }

    const now = Date.now();

    // Get all pending, non-expired invitations for this email
    console.time("getUserInvitations:fetchInvitations");
    const invitations = await ctx.db
      .query("teamInvitations")
      .withIndex("by_email", (q) => q.eq("email", email))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .collect();
    console.timeEnd("getUserInvitations:fetchInvitations");

    // Batch fetch team details for all unique team IDs
    console.time("getUserInvitations:enrichWithTeamData");
    const uniqueTeamIds = [...new Set(invitations.map((inv) => inv.teamId))];
    const teams = await Promise.all(uniqueTeamIds.map((id) => ctx.db.get(id)));
    const teamsMap = new Map(uniqueTeamIds.map((id, i) => [id, teams[i]]));

    // Enrich invitations with team data from the map (no additional queries)
    const invitationsWithTeams = invitations.map((invitation) => {
      const team = teamsMap.get(invitation.teamId);
      return {
        ...invitation,
        team: team ? { name: team.name, logoUrl: team.logoUrl } : null,
      };
    });
    console.timeEnd("getUserInvitations:enrichWithTeamData");

    return invitationsWithTeams.filter((inv) => inv.team !== null);
  },
});

// Get all invitations for the current user's team
export const getTeamInvitations = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("declined"),
        v.literal("cancelled"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    console.time("getTeamInvitations:getAuthUser");
    const user = await authComponent.getAuthUser(ctx);
    console.timeEnd("getTeamInvitations:getAuthUser");
    if (!user) {
      throw new Error("Not authenticated");
    }

    const userId = user.userId || user._id.toString();

    // Get user's current team from settings
    console.time("getTeamInvitations:getSettings");
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    console.timeEnd("getTeamInvitations:getSettings");

    if (!settings) {
      throw new Error("User settings not found");
    }

    // Check if user is a member of this team
    console.time("getTeamInvitations:checkMembership");
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", settings.currentTeamId).eq("userId", userId),
      )
      .first();
    console.timeEnd("getTeamInvitations:checkMembership");

    if (!membership) {
      throw new Error("Not a member of this team");
    }

    // Get all invitations for the team
    console.time("getTeamInvitations:fetchInvitations");
    const invitations = await ctx.db
      .query("teamInvitations")
      .withIndex("by_team", (q) => q.eq("teamId", settings.currentTeamId))
      .collect();
    console.timeEnd("getTeamInvitations:fetchInvitations");

    // Filter by status if provided
    if (args.status) {
      return invitations.filter((inv) => inv.status === args.status);
    }

    return invitations;
  },
});

// Accept an invitation
export const acceptInvitation = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    console.time("acceptInvitation:getAuthUser");
    const user = await authComponent.getAuthUser(ctx);
    console.timeEnd("acceptInvitation:getAuthUser");
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Find the invitation by token
    console.time("acceptInvitation:findInvitation");
    const invitation = await ctx.db
      .query("teamInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    console.timeEnd("acceptInvitation:findInvitation");

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Check if invitation is valid
    if (invitation.status !== "pending") {
      throw new Error("This invitation is no longer valid");
    }

    const now = Date.now();
    if (invitation.expiresAt < now) {
      throw new Error("This invitation has expired");
    }

    // Check if email matches (case-insensitive)
    const userEmail = user.email?.toLowerCase();
    if (!userEmail || userEmail !== invitation.email) {
      throw new Error("This invitation was sent to a different email address");
    }

    const userId = user.userId || user._id.toString();

    // Check if user is already a member
    console.time("acceptInvitation:checkExistingMembership");
    const existingMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", invitation.teamId).eq("userId", userId),
      )
      .first();
    console.timeEnd("acceptInvitation:checkExistingMembership");

    if (existingMembership) {
      throw new Error("You are already a member of this team");
    }

    // Add user to team
    console.time("acceptInvitation:addTeamMember");
    await ctx.db.insert("teamMembers", {
      teamId: invitation.teamId,
      userId: userId,
      role: invitation.role,
      joinedAt: now,
    });
    console.timeEnd("acceptInvitation:addTeamMember");

    // Update invitation status
    console.time("acceptInvitation:updateInvitationStatus");
    await ctx.db.patch(invitation._id, {
      status: "accepted",
      acceptedAt: now,
    });
    console.timeEnd("acceptInvitation:updateInvitationStatus");

    // Get or create user settings
    console.time("acceptInvitation:getSettings");
    let settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    console.timeEnd("acceptInvitation:getSettings");

    if (!settings) {
      // Create settings with the new team as current team
      console.time("acceptInvitation:createSettings");
      await ctx.db.insert("userSettings", {
        userId: userId,
        currentTeamId: invitation.teamId,
        updatedAt: now,
      });
      console.timeEnd("acceptInvitation:createSettings");
    } else {
      // Update current team to the newly joined team
      console.time("acceptInvitation:updateSettings");
      await ctx.db.patch(settings._id, {
        currentTeamId: invitation.teamId,
        updatedAt: now,
      });
      console.timeEnd("acceptInvitation:updateSettings");
    }

    return invitation.teamId;
  },
});

// Decline an invitation
export const declineInvitation = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    console.time("declineInvitation:getAuthUser");
    const user = await authComponent.getAuthUser(ctx);
    console.timeEnd("declineInvitation:getAuthUser");
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Find the invitation by token
    console.time("declineInvitation:findInvitation");
    const invitation = await ctx.db
      .query("teamInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    console.timeEnd("declineInvitation:findInvitation");

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("This invitation is no longer actionable");
    }

    // Check if invitation belongs to user's email
    const userEmail = user.email?.toLowerCase();
    if (!userEmail || userEmail !== invitation.email) {
      throw new Error("This invitation was sent to a different email address");
    }

    // Update invitation status
    console.time("declineInvitation:updateStatus");
    await ctx.db.patch(invitation._id, {
      status: "declined",
    });
    console.timeEnd("declineInvitation:updateStatus");

    return { success: true };
  },
});

// Cancel an invitation (for team admins)
export const cancelInvitation = mutation({
  args: {
    invitationId: v.id("teamInvitations"),
  },
  handler: async (ctx, args) => {
    console.time("cancelInvitation:getAuthUser");
    const user = await authComponent.getAuthUser(ctx);
    console.timeEnd("cancelInvitation:getAuthUser");
    if (!user) {
      throw new Error("Not authenticated");
    }

    console.time("cancelInvitation:getInvitation");
    const invitation = await ctx.db.get(args.invitationId);
    console.timeEnd("cancelInvitation:getInvitation");
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Check if user is a member of the team
    console.time("cancelInvitation:checkMembership");
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q
          .eq("teamId", invitation.teamId)
          .eq("userId", user.userId || user._id.toString()),
      )
      .first();
    console.timeEnd("cancelInvitation:checkMembership");

    if (!membership) {
      throw new Error("Not a member of this team");
    }

    // Future: Check permissions
    // if (membership.role !== "owner" && membership.role !== "admin") {
    //   throw new Error("Insufficient permissions");
    // }

    if (invitation.status !== "pending") {
      throw new Error("Only pending invitations can be cancelled");
    }

    console.time("cancelInvitation:updateStatus");
    await ctx.db.patch(args.invitationId, {
      status: "cancelled",
    });
    console.timeEnd("cancelInvitation:updateStatus");
    return { success: true };
  },
});
