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
    console.time("getCommentsBySearchResult:getAuthUser");
    const user = await authComponent.getAuthUser(ctx);
    console.timeEnd("getCommentsBySearchResult:getAuthUser");
    if (!user) {
      throw new Error("Not authenticated");
    }

    const userId = user.userId || user._id.toString();

    // Get the topic to verify access
    console.time("getCommentsBySearchResult:getTopic");
    const topic = await ctx.db.get(args.topicId);
    console.timeEnd("getCommentsBySearchResult:getTopic");
    if (!topic) {
      throw new Error("Topic not found");
    }

    // Check if topic is deleted
    if (topic.deletedAt !== undefined) {
      throw new Error("Topic not found");
    }

    // Check if user is a member of the team
    console.time("getCommentsBySearchResult:checkMembership");
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", topic.teamId).eq("userId", userId),
      )
      .first();
    console.timeEnd("getCommentsBySearchResult:checkMembership");

    if (!membership) {
      throw new Error("Not a member of this team");
    }

    // Get all comments for this search result (both top-level and replies) in one query
    console.time("getCommentsBySearchResult:fetchComments");
    const allComments = await ctx.db
      .query("comments")
      .withIndex("by_search_result", (q) =>
        q.eq("searchResultId", args.searchResultId),
      )
      .filter((q) => q.eq(q.field("topicId"), args.topicId))
      .order("desc")
      .collect();
    console.timeEnd("getCommentsBySearchResult:fetchComments");

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

    // Batch fetch user information for all unique user IDs
    console.time("getCommentsBySearchResult:enrichWithUserData");
    const uniqueUserIds = [...new Set(topLevelComments.map((c) => c.userId))];
    const users = await Promise.all(
      uniqueUserIds.map((id) => authComponent.getAnyUserById(ctx, id)),
    );
    const userMap = new Map(uniqueUserIds.map((id, i) => [id, users[i]]));

    // Enrich comments with user data from the map (no additional queries)
    const commentsWithUser = topLevelComments.map((comment) => {
      const commentUser = userMap.get(comment.userId);

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
    });
    console.timeEnd("getCommentsBySearchResult:enrichWithUserData");

    return commentsWithUser;
  },
});

// Get all replies to a specific comment
export const getCommentReplies = query({
  args: {
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    console.time("getCommentReplies:getAuthUser");
    const user = await authComponent.getAuthUser(ctx);
    console.timeEnd("getCommentReplies:getAuthUser");
    if (!user) {
      throw new Error("Not authenticated");
    }

    const userId = user.userId || user._id.toString();

    // Get the parent comment to verify access
    console.time("getCommentReplies:getParentComment");
    const parentComment = await ctx.db.get(args.commentId);
    console.timeEnd("getCommentReplies:getParentComment");
    if (!parentComment) {
      throw new Error("Comment not found");
    }

    // Get the topic to verify access
    console.time("getCommentReplies:getTopic");
    const topic = await ctx.db.get(parentComment.topicId);
    console.timeEnd("getCommentReplies:getTopic");
    if (!topic || topic.deletedAt !== undefined) {
      throw new Error("Topic not found");
    }

    // Check if user is a member of the team
    console.time("getCommentReplies:checkMembership");
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", topic.teamId).eq("userId", userId),
      )
      .first();
    console.timeEnd("getCommentReplies:checkMembership");

    if (!membership) {
      throw new Error("Not a member of this team");
    }

    // Get all replies to this comment
    console.time("getCommentReplies:fetchReplies");
    const replies = await ctx.db
      .query("comments")
      .withIndex("by_parent_comment", (q) =>
        q.eq("parentCommentId", args.commentId),
      )
      .order("desc")
      .collect();
    console.timeEnd("getCommentReplies:fetchReplies");

    // Batch fetch user information for all unique user IDs
    console.time("getCommentReplies:enrichWithUserData");
    const uniqueUserIds = [...new Set(replies.map((r) => r.userId))];
    const users = await Promise.all(
      uniqueUserIds.map((id) => authComponent.getAnyUserById(ctx, id)),
    );
    const userMap = new Map(uniqueUserIds.map((id, i) => [id, users[i]]));

    // Enrich replies with user data from the map (no additional queries)
    const repliesWithUser = replies.map((reply) => {
      const replyUser = userMap.get(reply.userId);
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
    });
    console.timeEnd("getCommentReplies:enrichWithUserData");

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
    console.time("addComment:getAuthUser");
    const user = await authComponent.getAuthUser(ctx);
    console.timeEnd("addComment:getAuthUser");
    if (!user) {
      throw new Error("Not authenticated");
    }

    const userId = user.userId || user._id.toString();

    // Validate content
    if (!args.content.trim()) {
      throw new Error("Comment content cannot be empty");
    }

    // Get the topic to verify access
    console.time("addComment:getTopic");
    const topic = await ctx.db.get(args.topicId);
    console.timeEnd("addComment:getTopic");
    if (!topic) {
      throw new Error("Topic not found");
    }

    console.time("addComment:getSearchResult");
    const searchResult = await ctx.db.get(args.searchResultId);
    console.timeEnd("addComment:getSearchResult");
    if (!searchResult || searchResult.topicId !== args.topicId) {
      throw new Error("Search result not found");
    }

    if (args.parentCommentId) {
      console.time("addComment:validateParentComment");
      const parentComment = await ctx.db.get(args.parentCommentId);
      console.timeEnd("addComment:validateParentComment");
      if (
        !parentComment ||
        parentComment.topicId !== args.topicId ||
        parentComment.searchResultId !== args.searchResultId
      ) {
        throw new Error("Invalid parent comment reference");
      }
    }

    // Check if topic is deleted
    if (topic.deletedAt !== undefined) {
      throw new Error("Topic not found");
    }

    // Check if user is a member of the team
    console.time("addComment:checkMembership");
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", topic.teamId).eq("userId", userId),
      )
      .first();
    console.timeEnd("addComment:checkMembership");

    if (!membership) {
      throw new Error("Not a member of this team");
    }

    const now = Date.now();

    // Create the comment
    console.time("addComment:insertComment");
    const commentId = await ctx.db.insert("comments", {
      topicId: args.topicId,
      searchResultId: args.searchResultId,
      userId,
      content: args.content.trim(),
      parentCommentId: args.parentCommentId,
      createdAt: now,
      updatedAt: now,
    });
    console.timeEnd("addComment:insertComment");

    return commentId;
  },
});
