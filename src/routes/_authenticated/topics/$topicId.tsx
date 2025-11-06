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
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/topics/$topicId")({
  component: TopicPage,
});

function TopicPage() {
  const { topicId } = Route.useParams();
  const [selectedSearchResultId, setSelectedSearchResultId] =
    useState<Id<"searchResults"> | null>(null);

  const { data: topic } = useSuspenseQuery(
    convexQuery(api.topicsDb.getTopic, {
      topicId: topicId as Id<"topics">,
    }),
  );

  const { data: searchResults } = useSuspenseQuery(
    convexQuery(api.searchResults.getSearchResultsByTopic, {
      topicId: topicId as Id<"topics">,
    }),
  );

  const handleResultClick = (searchResultId: Id<"searchResults">) => {
    setSelectedSearchResultId(searchResultId);
  };

  return (
    <div className="h-full flex gap-4 p-4 overflow-hidden">
      {/* Main Content - 2/3 width */}
      <div className="flex-2 flex flex-col overflow-hidden">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="mb-2 shrink-0 justify-start w-fit"
        >
          <Link to="/topics">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Topics
          </Link>
        </Button>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="shrink-0 mb-2">
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
            {searchResults.length > 0 && (
              <>
                <div className="flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
                  <Search className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">
                    Search Results ({searchResults.length})
                  </h2>
                </div>
                <div className="space-y-3 pb-6">
                  {searchResults.map((result) => (
                    <ScrapedResultItem
                      key={result._id}
                      result={result}
                      onClick={handleResultClick}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Empty State */}
            {searchResults.length === 0 &&
              topic.scrapeStatus === "completed" && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No search results available for this topic.
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
      </div>

      {/* Side Panel - Comments - 1/3 width */}
      {selectedSearchResultId && (
        <div className="flex-1 flex flex-col overflow-hidden pt-10">
          <TopicCommentsPanel
            isOpen={true}
            onClose={() => setSelectedSearchResultId(null)}
            topicId={topicId as Id<"topics">}
            searchResultId={selectedSearchResultId}
          />
        </div>
      )}
    </div>
  );
}
