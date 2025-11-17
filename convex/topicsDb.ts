import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { authComponent } from "./auth";
import { Autumn as autumn } from "autumn-js";

// Internal mutation to create topic in database
export const _createTopicInDb = internalMutation({
  args: {
    teamId: v.id("teams"),
    title: v.string(),
    description: v.string(),
    createdBy: v.string(),
    frequency: v.union(
      v.literal("1h"),
      v.literal("6h"),
      v.literal("12h"),
      v.literal("24h"),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    console.time("_createTopicInDb:insertTopic");
    const topicId = await ctx.db.insert("topics", {
      teamId: args.teamId,
      title: args.title,
      description: args.description,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
      scrapeStatus: "pending",
      frequency: args.frequency,
      retryCount: 0,
      permanentFailure: false,
    });
    console.timeEnd("_createTopicInDb:insertTopic");

    return topicId;
  },
});

// Internal query to get a topic by ID (for internal use)
export const _getTopicById = internalQuery({
  args: {
    topicId: v.id("topics"),
  },
  handler: async (ctx, args) => {
    console.time("_getTopicById:getTopic");
    const topic = await ctx.db.get(args.topicId);
    console.timeEnd("_getTopicById:getTopic");
    return topic;
  },
});

// Internal mutation to update topic scrape status
export const _updateTopicScrapeStatus = internalMutation({
  args: {
    topicId: v.id("topics"),
    scrapeStatus: v.union(
      v.literal("completed"),
      v.literal("failed"),
      v.literal("pending"),
    ),
    scrapeError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const updates: any = {
      scrapeStatus: args.scrapeStatus,
      scrapeError: args.scrapeError,
    };

    if (args.scrapeStatus === "completed") {
      updates.lastScrapedAt = now;
      updates.retryCount = 0; // Reset retry count on success
    }

    console.time("_updateTopicScrapeStatus:patchTopic");
    await ctx.db.patch(args.topicId, updates);
    console.timeEnd("_updateTopicScrapeStatus:patchTopic");
  },
});

// Internal mutation to increment retry count
export const _incrementRetryCount = internalMutation({
  args: {
    topicId: v.id("topics"),
  },
  handler: async (ctx, args) => {
    console.time("_incrementRetryCount:getTopic");
    const topic = await ctx.db.get(args.topicId);
    console.timeEnd("_incrementRetryCount:getTopic");
    if (!topic) return;

    console.time("_incrementRetryCount:patchTopic");
    await ctx.db.patch(args.topicId, {
      retryCount: topic.retryCount + 1,
    });
    console.timeEnd("_incrementRetryCount:patchTopic");
  },
});

// Internal mutation to mark topic as permanently failed
export const _markPermanentFailure = internalMutation({
  args: {
    topicId: v.id("topics"),
    scrapeError: v.string(),
  },
  handler: async (ctx, args) => {
    console.time("_markPermanentFailure:patchTopic");
    await ctx.db.patch(args.topicId, {
      permanentFailure: true,
      scrapeStatus: "failed",
      scrapeError: args.scrapeError,
    });
    console.timeEnd("_markPermanentFailure:patchTopic");
  },
});

// Get all active topics for the current user's team
export const getTopics = query({
  args: {},
  handler: async (ctx) => {
    console.time("getTopics:getAuthUser");
    const user = await authComponent.getAuthUser(ctx);
    console.timeEnd("getTopics:getAuthUser");
    if (!user) {
      throw new Error("Not authenticated");
    }

    const userId = user.userId || user._id.toString();

    // Get user's current team from settings
    console.time("getTopics:getSettings");
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    console.timeEnd("getTopics:getSettings");

    if (!settings) {
      throw new Error("User settings not found");
    }

    // Check if user is a member of this team
    console.time("getTopics:checkMembership");
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", settings.currentTeamId).eq("userId", userId),
      )
      .first();
    console.timeEnd("getTopics:checkMembership");

    if (!membership) {
      throw new Error("Not a member of this team");
    }

    // Get all topics for the team that are not deleted
    console.time("getTopics:fetchTopics");
    const topics = await ctx.db
      .query("topics")
      .withIndex("by_team", (q) => q.eq("teamId", settings.currentTeamId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
    console.timeEnd("getTopics:fetchTopics");

    // Get creator information for each topic
    console.time("getTopics:enrichWithCreatorData");
    const topicsWithCreator = await Promise.all(
      topics.map(async (topic) => {
        const creator = await authComponent.getAnyUserById(
          ctx,
          topic.createdBy,
        );
        return {
          ...topic,
          creatorName: creator?.name || null,
          creatorEmail: creator?.email || null,
        };
      }),
    );
    console.timeEnd("getTopics:enrichWithCreatorData");

    return topicsWithCreator;
  },
});

// Get a single topic by ID
export const getTopic = query({
  args: {
    topicId: v.id("topics"),
  },
  handler: async (ctx, args) => {
    console.time("getTopic:getAuthUser");
    const user = await authComponent.getAuthUser(ctx);
    console.timeEnd("getTopic:getAuthUser");
    if (!user) {
      throw new Error("Not authenticated");
    }

    console.time("getTopic:getTopic");
    const topic = await ctx.db.get(args.topicId);
    console.timeEnd("getTopic:getTopic");
    if (!topic) {
      throw new Error("Topic not found");
    }

    // Check if topic is deleted
    if (topic.deletedAt !== undefined) {
      throw new Error("Topic not found");
    }

    const userId = user.userId || user._id.toString();

    // Check if user is a member of the team
    console.time("getTopic:checkMembership");
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", topic.teamId).eq("userId", userId),
      )
      .first();
    console.timeEnd("getTopic:checkMembership");

    if (!membership) {
      throw new Error("Not a member of this team");
    }

    // Get creator information
    console.time("getTopic:getCreatorInfo");
    const creator = await authComponent.getAnyUserById(ctx, topic.createdBy);
    console.timeEnd("getTopic:getCreatorInfo");

    return {
      ...topic,
      creatorName: creator?.name || null,
      creatorEmail: creator?.email || null,
    };
  },
});

// Update a topic
export const updateTopic = mutation({
  args: {
    topicId: v.id("topics"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    frequency: v.union(
      v.literal("1h"),
      v.literal("6h"),
      v.literal("12h"),
      v.literal("24h"),
    ),
  },
  handler: async (ctx, args) => {
    console.time("updateTopic:getAuthUser");
    const user = await authComponent.getAuthUser(ctx);
    console.timeEnd("updateTopic:getAuthUser");
    if (!user) {
      throw new Error("Not authenticated");
    }

    console.time("updateTopic:getTopic");
    const topic = await ctx.db.get(args.topicId);
    console.timeEnd("updateTopic:getTopic");
    if (!topic) {
      throw new Error("Topic not found");
    }

    // Check if topic is deleted
    if (topic.deletedAt !== undefined) {
      throw new Error("Topic not found");
    }

    const userId = user.userId || user._id.toString();

    // Check if user is a member of the team
    console.time("updateTopic:checkMembership");
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", topic.teamId).eq("userId", userId),
      )
      .first();
    console.timeEnd("updateTopic:checkMembership");

    if (!membership) {
      throw new Error("Not a member of this team");
    }

    const updates: {
      updatedAt: number;
      title?: string;
      description?: string;
      frequency: "1h" | "6h" | "12h" | "24h";
    } = {
      updatedAt: Date.now(),
      frequency: args.frequency,
    };

    if (args.title !== undefined) {
      updates.title = args.title;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    console.time("updateTopic:patchTopic");
    await ctx.db.patch(args.topicId, updates);
    console.timeEnd("updateTopic:patchTopic");

    return { success: true };
  },
});

// Internal mutation to soft delete a topic in the database
export const _deleteTopicInDb = internalMutation({
  args: {
    topicId: v.id("topics"),
  },
  handler: async (ctx, args) => {
    console.time("_deleteTopicInDb:patchTopic");
    await ctx.db.patch(args.topicId, {
      deletedAt: Date.now(),
    });
    console.timeEnd("_deleteTopicInDb:patchTopic");
  },
});
