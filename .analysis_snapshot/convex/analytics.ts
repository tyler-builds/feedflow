import { query } from "./_generated/server";
import { authComponent } from "./auth";

export const getTeamAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const userId = user.userId || user._id.toString();

    // Get user settings to find current team
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!settings) {
      throw new Error("User settings not found");
    }

    const currentTeamId = settings.currentTeamId;

    if (!currentTeamId) {
      return null;
    }

    // Get team members count
    const teamMembers = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", currentTeamId))
      .collect();
    const memberCount = teamMembers.length;

    // Get topics stats
    const allTopics = await ctx.db
      .query("topics")
      .withIndex("by_team", (q) => q.eq("teamId", currentTeamId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const totalTopics = allTopics.length;
    const activeTopics = allTopics.filter(
      (t) => t.pausedAt === undefined && t.scrapeStatus !== "failed",
    ).length;
    const failedTopics = allTopics.filter(
      (t) => t.scrapeStatus === "failed",
    ).length;

    // Get total search results and comments across all topics
    const topicIds = allTopics.map((t) => t._id);
    let totalSearchResults = 0;
    let totalComments = 0;
    let allComments = [];

    for (const topicId of topicIds) {
      const results = await ctx.db
        .query("searchResults")
        .withIndex("by_topic", (q) => q.eq("topicId", topicId))
        .collect();
      totalSearchResults += results.length;

      const comments = await ctx.db
        .query("comments")
        .withIndex("by_topic", (q) => q.eq("topicId", topicId))
        .collect();
      totalComments += comments.length;
      allComments.push(...comments);
    }

    // Get recent activity (most recent topic or comment update)
    const recentTopic = allTopics.sort(
      (a, b) =>
        (b.updatedAt || b._creationTime) - (a.updatedAt || a._creationTime),
    )[0];
    const recentComment = allComments.sort(
      (a, b) => b._creationTime - a._creationTime,
    )[0];

    const lastActivityTime = Math.max(
      recentTopic?.updatedAt || recentTopic?._creationTime || 0,
      recentComment?._creationTime || 0,
    );

    return {
      memberCount,
      totalTopics,
      activeTopics,
      failedTopics,
      totalSearchResults,
      totalComments,
      lastActivityTime: lastActivityTime > 0 ? lastActivityTime : null,
    };
  },
});
