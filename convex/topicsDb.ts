import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { authComponent } from "./auth";

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

    return topicId;
  },
});

// Internal query to get a topic by ID (for internal use)
export const _getTopicById = internalQuery({
  args: {
    topicId: v.id("topics"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.topicId);
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

    await ctx.db.patch(args.topicId, updates);
  },
});

// Internal mutation to increment retry count
export const _incrementRetryCount = internalMutation({
  args: {
    topicId: v.id("topics"),
  },
  handler: async (ctx, args) => {
    const topic = await ctx.db.get(args.topicId);
    if (!topic) return;

    await ctx.db.patch(args.topicId, {
      retryCount: topic.retryCount + 1,
    });
  },
});

// Internal mutation to mark topic as permanently failed
export const _markPermanentFailure = internalMutation({
  args: {
    topicId: v.id("topics"),
    scrapeError: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.topicId, {
      permanentFailure: true,
      scrapeStatus: "failed",
      scrapeError: args.scrapeError,
    });
  },
});

// Get all active topics for the current user's team
export const getTopics = query({
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

    // Get all topics for the team that are not deleted
    const topics = await ctx.db
      .query("topics")
      .withIndex("by_team", (q) => q.eq("teamId", settings.currentTeamId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Get creator information for each topic
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

    return topicsWithCreator;
  },
});

// Get a single topic by ID
export const getTopic = query({
  args: {
    topicId: v.id("topics"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

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

    // Get creator information
    const creator = await authComponent.getAnyUserById(ctx, topic.createdBy);

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
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

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

    await ctx.db.patch(args.topicId, updates);

    return { success: true };
  },
});

// Soft delete a topic
export const deleteTopic = mutation({
  args: {
    topicId: v.id("topics"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const topic = await ctx.db.get(args.topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }

    // Check if topic is already deleted
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

    // Future: Check if user has permission to delete
    // For now, any team member can delete topics
    // if (membership.role !== "owner" && membership.role !== "admin") {
    //   throw new Error("Insufficient permissions");
    // }

    // Soft delete by setting deletedAt timestamp
    await ctx.db.patch(args.topicId, {
      deletedAt: Date.now(),
    });

    return { success: true };
  },
});
