"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { authComponent } from "./auth";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import Firecrawl from "@mendable/firecrawl-js";
import * as searchResults from "./searchResults";

// Helper function to convert frequency string to milliseconds
function frequencyToMs(frequency: string): number {
  switch (frequency) {
    case "1h":
      return 3600000; // 1 hour
    case "6h":
      return 21600000; // 6 hours
    case "12h":
      return 43200000; // 12 hours
    case "24h":
      return 86400000; // 24 hours
    default:
      return 86400000; // Default to 24 hours
  }
}

// Internal action to scrape topic data with Firecrawl
export const _scrapeTopicWithFirecrawl = internalAction({
  args: {
    topicId: v.id("topics"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    // Validation: Check if topic exists and if it's time to scrape
    const topic = await ctx.runQuery(internal.topicsDb._getTopicById, {
      topicId: args.topicId,
    });

    if (!topic) {
      console.log(`Topic ${args.topicId} not found, skipping scrape`);
      return;
    }

    // Check if topic is deleted
    if (topic.deletedAt !== undefined) {
      console.log(`Topic ${args.topicId} is deleted, skipping scrape`);
      return;
    }

    // Check if enough time has passed since last scrape
    if (topic.lastScrapedAt) {
      const now = Date.now();
      const frequency = topic.frequency || "24h";
      const frequencyMs = frequencyToMs(frequency);
      const nextScrapeTime = topic.lastScrapedAt + frequencyMs;

      if (now < nextScrapeTime) {
        // It's too early to scrape - reschedule for the correct time
        const delay = nextScrapeTime - now;
        console.log(
          `Topic ${args.topicId} scrape scheduled too early. Rescheduling in ${delay}ms`,
        );
        await ctx.scheduler.runAfter(
          delay,
          internal.topicsActions._scrapeTopicWithFirecrawl,
          {
            topicId: args.topicId,
            title: args.title,
          },
        );
        return;
      }
    }

    // Set topic status to pending at the start of the scrape
    await ctx.runMutation(internal.topicsDb._updateTopicScrapeStatus, {
      topicId: args.topicId,
      scrapeStatus: "pending",
    });

    try {
      const apiKey = process.env.FIRECRAWL_API_KEY;
      if (!apiKey) {
        throw new Error("FIRECRAWL_API_KEY not configured");
      }

      const firecrawl = new Firecrawl({ apiKey });

      // Search for content related to the topic title
      const searchResults = await firecrawl.search(args.title, {
        limit: 3,
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
                      type: "string",
                    },
                  },
                },
              },
              prompt: "Extract a summary and key points as an array of strings",
            },
          ],
        },
      });

      // Parse and flatten the search results
      const flattenedResults: Array<{
        type: "web" | "news";
        title: string;
        url: string;
        position: number;
        description?: string;
        summary?: string;
        keyPoints?: string[];
        imageUrl?: string;
        date?: string;
        favicon?: string;
      }> = [];

      // Process web results
      if (searchResults.web && Array.isArray(searchResults.web)) {
        searchResults.web.forEach((webResult: any) => {
          flattenedResults.push({
            type: "web",
            title: webResult.title,
            url: webResult.url,
            position: webResult.position,
            description: webResult.description,
            summary: webResult.json?.summary,
            keyPoints: webResult.json?.keyPoints,
            favicon: webResult.metadata?.favicon,
          });
        });
      }

      // Process news results
      if (searchResults.news && Array.isArray(searchResults.news)) {
        searchResults.news.forEach((newsResult: any) => {
          flattenedResults.push({
            type: "news",
            title: newsResult.title,
            url: newsResult.url,
            position: newsResult.position,
            description: newsResult.snippet,
            summary: newsResult.json?.summary,
            keyPoints: newsResult.json?.keyPoints,
            imageUrl: newsResult.imageUrl,
            date: newsResult.date,
          });
        });
      }

      // Store the flattened results in the searchResults table
      await ctx.runMutation(internal.searchResults._insertSearchResults, {
        topicId: args.topicId,
        results: flattenedResults,
      });

      // Update topic status
      await ctx.runMutation(internal.topicsDb._updateTopicScrapeStatus, {
        topicId: args.topicId,
        scrapeStatus: "completed",
      });

      // Schedule the next scrape based on the topic's frequency
      const updatedTopic = await ctx.runQuery(internal.topicsDb._getTopicById, {
        topicId: args.topicId,
      });

      if (updatedTopic && updatedTopic.deletedAt === undefined) {
        const frequency = updatedTopic.frequency || "24h";
        const delay = frequencyToMs(frequency);

        console.log(
          `Scheduling next scrape for topic ${args.topicId} in ${delay}ms (${frequency})`,
        );

        await ctx.scheduler.runAfter(
          delay,
          internal.topicsActions._scrapeTopicWithFirecrawl,
          {
            topicId: args.topicId,
            title: args.title,
          },
        );
      }
    } catch (error) {
      console.error("Firecrawl search failed:", error);

      // Update topic with error status
      await ctx.runMutation(internal.topicsDb._updateTopicScrapeStatus, {
        topicId: args.topicId,
        scrapeStatus: "failed",
        scrapeError: error instanceof Error ? error.message : "Unknown error",
      });

      // Schedule retry even on failure (after the same frequency interval)
      const failedTopic = await ctx.runQuery(internal.topicsDb._getTopicById, {
        topicId: args.topicId,
      });

      if (failedTopic && failedTopic.deletedAt === undefined) {
        const frequency = failedTopic.frequency || "24h";
        const delay = frequencyToMs(frequency);

        console.log(
          `Scheduling retry scrape for topic ${args.topicId} in ${delay}ms (${frequency}) after failure`,
        );

        await ctx.scheduler.runAfter(
          delay,
          internal.topicsActions._scrapeTopicWithFirecrawl,
          {
            topicId: args.topicId,
            title: args.title,
          },
        );
      }
    }
  },
});

// Create a new topic with Firecrawl integration
export const createTopic = action({
  args: {
    title: v.string(),
    description: v.string(),
    frequency: v.optional(v.string()),
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
      frequency: args.frequency,
    });

    // Schedule Firecrawl scraping to run immediately in the background
    // This allows topic creation to return instantly without waiting for the API
    await ctx.scheduler.runAfter(
      0,
      internal.topicsActions._scrapeTopicWithFirecrawl,
      {
        topicId,
        title: args.title,
      },
    );

    return topicId;
  },
});
