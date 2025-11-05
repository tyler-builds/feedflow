"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { authComponent } from "./auth";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import Firecrawl from "@mendable/firecrawl-js";

// Create a new topic with Firecrawl integration
export const createTopic = action({
  args: {
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"topics">> => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const userId = user.userId || user._id.toString();

    // Get user's current team from settings
    const currentTeam = await ctx.runQuery(api.userSettings.getCurrentTeam, {});

    if (!currentTeam) {
      throw new Error("User settings not found");
    }

    // Create the topic in the database with pending scrape status
    const topicId = await ctx.runMutation(internal.topicsDb._createTopicInDb, {
      teamId: currentTeam._id,
      title: args.title,
      description: args.description,
      createdBy: userId,
    });

    // Start Firecrawl search in the background (non-blocking)
    // This happens after we return the topicId to the user
    try {
      const apiKey = process.env.FIRECRAWL_API_KEY;
      if (!apiKey) {
        throw new Error("FIRECRAWL_API_KEY not configured");
      }

      const firecrawl = new Firecrawl({ apiKey });

      // Search for content related to the topic title
      const searchResults = await firecrawl.search(args.title, {
        limit: 5,
        sources: ["web", "news"],
        scrapeOptions: {
          onlyMainContent: true,
          maxAge: 172800000,
          formats: [
            {
              type: "json",
              schema: {
                type: "object",
                required: ["summary", "keyPoints"],
                properties: {
                  summary: {
                    type: "string",
                  },
                  keyPoints: {
                    type: "array",
                    items: {
                      type: "object",
                      required: [],
                      properties: {},
                    },
                  },
                },
              },
              prompt: "Extract a summary and key points",
            },
          ],
        },
      });

      // Store the results as JSON string
      await ctx.runMutation(internal.topicsDb._updateTopicScrapeData, {
        topicId,
        scrapedData: JSON.stringify(searchResults),
        scrapeStatus: "completed",
      });
    } catch (error) {
      console.error("Firecrawl search failed:", error);

      // Update topic with error status
      await ctx.runMutation(internal.topicsDb._updateTopicScrapeData, {
        topicId,
        scrapeStatus: "failed",
        scrapeError: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return topicId;
  },
});
