import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TopicCommentsPanel } from "@/components/topic-comments-panel";
import { ScrapedResultItem } from "@/components/scraped-result-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowLeft, Search } from "lucide-react";
import type { ScrapedData, WebResult, NewsResult } from "@/types/scraped-data";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/topics/$topicId")({
  component: TopicPage,
});

function TopicPage() {
  const { topicId } = Route.useParams();
  const [isCommentsPanelOpen, setIsCommentsPanelOpen] = useState(false);

  const { data: topic } = useSuspenseQuery(
    convexQuery(api.topicsDb.getTopic, {
      topicId: topicId as Id<"topics">,
    }),
  );

  // Parse scraped data if available
  let scrapedData: ScrapedData | null = null;
  if (topic.scrapedData) {
    try {
      scrapedData = JSON.parse(topic.scrapedData) as ScrapedData;
    } catch (error) {
      console.error("Failed to parse scraped data:", error);
    }
  }

  // Merge web and news results into a single array with type info
  const allResults: Array<{
    item: WebResult | NewsResult;
    type: "web" | "news";
  }> = [];
  if (scrapedData) {
    scrapedData.web.forEach((item) => allResults.push({ item, type: "web" }));
    scrapedData.news.forEach((item) => allResults.push({ item, type: "news" }));
    // Sort by position to maintain search relevance
    allResults.sort((a, b) => a.item.position - b.item.position);
  }
  return (
    <div className="h-full flex gap-4 p-4 overflow-hidden">
      {/* Main Content - 2/3 width */}
      <div className="flex-2 flex flex-col overflow-hidden">
        <div className="shrink-0 mb-2">
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link to="/topics">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Topics
            </Link>
          </Button>

          <Card>
            <CardHeader>
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tight">
                  {topic.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {topic.creatorName && (
                    <div className="flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      <span>{topic.creatorName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Created {new Date(topic.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Badge
                    variant={
                      topic.scrapeStatus === "completed"
                        ? "default"
                        : topic.scrapeStatus === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {topic.scrapeStatus}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {topic.description}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scrollable Results Section */}
        <div className="flex-1 overflow-y-auto">
          {/* Unified Search Results */}
          {allResults.length > 0 && (
            <>
              <div className="flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
                <Search className="h-5 w-5" />
                <h2 className="text-xl font-semibold">
                  Search Results ({allResults.length})
                </h2>
              </div>
              <div className="space-y-3 pb-6">
                {allResults.map((result, index) => (
                  <ScrapedResultItem
                    key={`${result.type}-${index}`}
                    item={result.item}
                    type={result.type}
                    onClick={() => setIsCommentsPanelOpen(true)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Empty State */}
          {!scrapedData && topic.scrapeStatus === "completed" && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No scraped data available for this topic.
              </CardContent>
            </Card>
          )}

          {topic.scrapeStatus === "pending" && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Scraping in progress... Check back soon!
              </CardContent>
            </Card>
          )}

          {topic.scrapeStatus === "failed" && (
            <Card>
              <CardContent className="py-8 text-center text-destructive">
                Scraping failed.{" "}
                {topic.scrapeError || "Please try again later."}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Side Panel - Comments - 1/3 width */}
      {isCommentsPanelOpen && (
        <div className="flex-1 overflow-hidden">
          <TopicCommentsPanel
            isOpen={isCommentsPanelOpen}
            onClose={() => setIsCommentsPanelOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
