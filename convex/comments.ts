import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// Get all comments for a specific search result
export const getCommentsBySearchResult = query({
  args: {
    topicId: v.id("topics"),
    searchResultId: v.id("searchResults"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const userId = user.userId || user._id.toString();

    // Get the topic to verify access
    const topic = await ctx.db.get(args.topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }

    // Check if topic is deleted
    if (topic.deletedAt !== undefined) {
      throw new Error("Topic not found");
    }

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

    // Get all comments for this search result (both top-level and replies) in one query
    const allComments = await ctx.db
      .query("comments")
      .withIndex("by_search_result", (q) =>
        q.eq("searchResultId", args.searchResultId),
      )
      .filter((q) => q.eq(q.field("topicId"), args.topicId))
      .order("desc")
      .collect();

    // Separate top-level comments from replies
    const topLevelComments = allComments.filter(
      (c) => c.parentCommentId === undefined,
    );

    // Build a map of reply counts for each parent comment (in memory, no extra queries)
    const replyCountMap = new Map<string, number>();
    for (const comment of allComments) {
      if (comment.parentCommentId) {
        const currentCount = replyCountMap.get(comment.parentCommentId) || 0;
        replyCountMap.set(comment.parentCommentId, currentCount + 1);
      }
    }

    // Get user information for each top-level comment
    const commentsWithUser = await Promise.all(
      topLevelComments.map(async (comment) => {
        const commentUser = await authComponent.getAnyUserById(
          ctx,
          comment.userId,
        );

        return {
          ...comment,
          replyCount: replyCountMap.get(comment._id) || 0,
          author: {
            name: commentUser?.name || "Unknown User",
            email: commentUser?.email || null,
            avatar: commentUser?.image || undefined,
            initials: commentUser?.name
              ? commentUser.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              : "??",
          },
        };
      }),
    );

    return commentsWithUser;
  },
});

// Get all replies to a specific comment
export const getCommentReplies = query({
  args: {
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const userId = user.userId || user._id.toString();

    // Get the parent comment to verify access
    const parentComment = await ctx.db.get(args.commentId);
    if (!parentComment) {
      throw new Error("Comment not found");
    }

    // Get the topic to verify access
    const topic = await ctx.db.get(parentComment.topicId);
    if (!topic || topic.deletedAt !== undefined) {
      throw new Error("Topic not found");
    }

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

    // Get all replies to this comment
    const replies = await ctx.db
      .query("comments")
      .withIndex("by_parent_comment", (q) =>
        q.eq("parentCommentId", args.commentId),
      )
      .order("desc")
      .collect();

    // Get user information for each reply
    const repliesWithUser = await Promise.all(
      replies.map(async (reply) => {
        const replyUser = await authComponent.getAnyUserById(ctx, reply.userId);
        return {
          ...reply,
          author: {
            name: replyUser?.name || "Unknown User",
            email: replyUser?.email || null,
            avatar: replyUser?.image || undefined,
            initials: replyUser?.name
              ? replyUser.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              : "??",
          },
        };
      }),
    );

    return repliesWithUser;
  },
});

// Add a new comment to a search result
export const addComment = mutation({
  args: {
    topicId: v.id("topics"),
    searchResultId: v.id("searchResults"),
    content: v.string(),
    parentCommentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const userId = user.userId || user._id.toString();

    // Validate content
    if (!args.content.trim()) {
      throw new Error("Comment content cannot be empty");
    }

    // Get the topic to verify access
    const topic = await ctx.db.get(args.topicId);
    if (!topic) {
      throw new Error("Topic not found");
    }

    // Check if topic is deleted
    if (topic.deletedAt !== undefined) {
      throw new Error("Topic not found");
    }

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

    const now = Date.now();

    // Create the comment
    const commentId = await ctx.db.insert("comments", {
      topicId: args.topicId,
      searchResultId: args.searchResultId,
      userId,
      content: args.content.trim(),
      parentCommentId: args.parentCommentId,
      createdAt: now,
      updatedAt: now,
    });

    return commentId;
  },
});
