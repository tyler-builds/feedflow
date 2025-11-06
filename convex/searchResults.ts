import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// Internal mutation to bulk insert search results for a topic
export const _insertSearchResults = internalMutation({
  args: {
    topicId: v.id("topics"),
    results: v.array(
      v.object({
        type: v.union(v.literal("web"), v.literal("news")),
        title: v.string(),
        url: v.string(),
        position: v.number(),
        description: v.optional(v.string()),
        summary: v.optional(v.string()),
        keyPoints: v.optional(v.array(v.string())),
        imageUrl: v.optional(v.string()),
        date: v.optional(v.string()),
        favicon: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Insert all search results
    for (const result of args.results) {
      await ctx.db.insert("searchResults", {
        topicId: args.topicId,
        type: result.type,
        title: result.title,
        url: result.url,
        position: result.position,
        description: result.description,
        summary: result.summary,
        keyPoints: result.keyPoints,
        imageUrl: result.imageUrl,
        date: result.date,
        favicon: result.favicon,
        createdAt: now,
      });
    }
  },
});

// Get all search results for a topic, sorted by position
export const getSearchResultsByTopic = query({
  args: {
    topicId: v.id("topics"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get the topic to verify permissions
    const topic = await ctx.db.get(args.topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }

    // Check if topic is deleted
    if (topic.deletedAt !== undefined) {
      throw new Error("Topic not found");
    }

    const userId = user.userId || user._id.toString();

    // Check if user is a member of the team
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", topic.teamId).eq("userId", userId),
      )
      .first();

    if (!membership) {
      throw new Error("Not a member of this team");
    }

    // Get all search results for this topic, sorted by position
    const results = await ctx.db
      .query("searchResults")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
      .collect();

    // Sort by position (since we can't do compound index ordering in Convex)
    results.sort((a, b) => a.position - b.position);

    return results;
  },
});
