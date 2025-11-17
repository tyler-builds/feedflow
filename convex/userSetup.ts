import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Internal mutation to create a personal team for a new user
// This should be called after user signup
export const createPersonalTeam = internalMutation({
  args: {
    userId: v.string(),
    userName: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already has a team
    console.time("createPersonalTeam:checkExistingMembership");
    const existingMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    console.timeEnd("createPersonalTeam:checkExistingMembership");

    if (existingMembership) {
      // User already has a team, skip creation
      return null;
    }

    const now = Date.now();
    const teamName = "Personal";

    // Generate slug from team name
    const slug = `personal-${now}`;

    // Create the personal team
    console.time("createPersonalTeam:insertTeam");
    const teamId = await ctx.db.insert("teams", {
      name: teamName,
      slug,
      ownerId: args.userId,
      createdAt: now,
      updatedAt: now,
    });
    console.timeEnd("createPersonalTeam:insertTeam");

    // Add user as owner
    console.time("createPersonalTeam:addOwnerMember");
    await ctx.db.insert("teamMembers", {
      teamId,
      userId: args.userId,
      role: "owner",
      joinedAt: now,
    });
    console.timeEnd("createPersonalTeam:addOwnerMember");

    // Initialize user settings with this team as the current team
    console.time("createPersonalTeam:initUserSettings");
    await ctx.db.insert("userSettings", {
      userId: args.userId,
      currentTeamId: teamId,
      updatedAt: now,
    });
    console.timeEnd("createPersonalTeam:initUserSettings");

    return teamId;
  },
});
