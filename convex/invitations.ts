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
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Check if current user is a member of the team
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

    const normalizedEmail = args.email.toLowerCase();

    // Check if there's already a pending invitation for this email
    const existingInvitation = await ctx.db
      .query("teamInvitations")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .filter((q) => q.eq(q.field("email"), normalizedEmail))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingInvitation) {
      throw new Error("An invitation has already been sent to this email");
    }

    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    // Generate a secure random token
    const token = crypto.randomUUID();

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

    return invitationId;
  },
});

// Get pending invitations for the current user's email
export const getUserInvitations = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
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
    const invitations = await ctx.db
      .query("teamInvitations")
      .withIndex("by_email", (q) => q.eq("email", email))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .collect();

    // Get team details for each invitation
    const invitationsWithTeams = await Promise.all(
      invitations.map(async (invitation) => {
        const team = await ctx.db.get(invitation.teamId);
        return {
          ...invitation,
          team: team ? { name: team.name, logoUrl: team.logoUrl } : null,
        };
      }),
    );

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

    // Get all invitations for the team
    const invitations = await ctx.db
      .query("teamInvitations")
      .withIndex("by_team", (q) => q.eq("teamId", settings.currentTeamId))
      .collect();

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
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Find the invitation by token
    const invitation = await ctx.db
      .query("teamInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

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
    const existingMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", invitation.teamId).eq("userId", userId),
      )
      .first();

    if (existingMembership) {
      throw new Error("You are already a member of this team");
    }

    // Add user to team
    await ctx.db.insert("teamMembers", {
      teamId: invitation.teamId,
      userId: userId,
      role: invitation.role,
      joinedAt: now,
    });

    // Update invitation status
    await ctx.db.patch(invitation._id, {
      status: "accepted",
      acceptedAt: now,
    });

    // Get or create user settings
    let settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!settings) {
      // Create settings with the new team as current team
      await ctx.db.insert("userSettings", {
        userId: userId,
        currentTeamId: invitation.teamId,
        updatedAt: now,
      });
    } else {
      // Update current team to the newly joined team
      await ctx.db.patch(settings._id, {
        currentTeamId: invitation.teamId,
        updatedAt: now,
      });
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
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Find the invitation by token
    const invitation = await ctx.db
      .query("teamInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

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
    await ctx.db.patch(invitation._id, {
      status: "declined",
    });

    return { success: true };
  },
});

// Cancel an invitation (for team admins)
export const cancelInvitation = mutation({
  args: {
    invitationId: v.id("teamInvitations"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Check if user is a member of the team
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q
          .eq("teamId", invitation.teamId)
          .eq("userId", user.userId || user._id.toString()),
      )
      .first();

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

    await ctx.db.patch(args.invitationId, {
      status: "cancelled",
    });
    return { success: true };
  },
});
