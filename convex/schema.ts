import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  teams: defineTable({
    name: v.string(),
    slug: v.string(),
    logoUrl: v.optional(v.string()),
    ownerId: v.string(), // Better Auth user ID
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  teamMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.string(), // Better Auth user ID
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userId"])
    .index("by_team_and_user", ["teamId", "userId"]),

  teamInvitations: defineTable({
    teamId: v.id("teams"),
    email: v.string(),
    invitedBy: v.string(), // Better Auth user ID
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("cancelled"),
    ),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_team", ["teamId"])
    .index("by_email", ["email"])
    .index("by_token", ["token"])
    .index("by_status", ["status"]),

  userSettings: defineTable({
    userId: v.string(), // Better Auth user ID
    currentTeamId: v.id("teams"),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  topics: defineTable({
    teamId: v.id("teams"),
    title: v.string(),
    description: v.string(),
    createdBy: v.string(), // Better Auth user ID
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()), // For soft deletes
    scrapeStatus: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    lastScrapedAt: v.optional(v.number()),
    scrapeError: v.optional(v.string()),
  })
    .index("by_team", ["teamId"])
    .index("by_team_and_deleted", ["teamId", "deletedAt"]),

  searchResults: defineTable({
    topicId: v.id("topics"),
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
    createdAt: v.number(),
  })
    .index("by_topic", ["topicId"])
    .index("by_topic_and_type", ["topicId", "type"])
    .index("by_topic_and_position", ["topicId", "position"]),

  comments: defineTable({
    topicId: v.id("topics"),
    searchResultId: v.id("searchResults"),
    userId: v.string(), // Better Auth user ID
    content: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_search_result", ["searchResultId"])
    .index("by_topic", ["topicId"])
    .index("by_user", ["userId"]),
});
