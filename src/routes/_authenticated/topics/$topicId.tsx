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
import {
  Calendar,
  User,
  ArrowLeft,
  Search,
  MessageSquare,
  X,
} from "lucide-react";
import { useState, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateAnnotationModal } from "@/components/create-annotation-modal";
import { useMutation } from "convex/react";

export const Route = createFileRoute("/_authenticated/topics/$topicId")({
  component: TopicPage,
});

function CommentsPanelSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full border-l bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Comments</h2>
          <Skeleton className="h-5 w-8" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>

      {/* Comments List Skeleton */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-3 py-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Comment Input Skeleton */}
      <div className="border-t p-4 shrink-0">
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

function TopicPage() {
  const { topicId } = Route.useParams();
  const [selectedSearchResultId, setSelectedSearchResultId] =
    useState<Id<"searchResults"> | null>(null);
  const [activeAnnotationText, setActiveAnnotationText] = useState<
    string | null
  >(null);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [selectedTextForAnnotation, setSelectedTextForAnnotation] =
    useState("");

  const addCommentMutation = useMutation(api.comments.addComment);

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

  const handleCreateAnnotation = (highlightedText: string) => {
    setSelectedTextForAnnotation(highlightedText);
    setShowAnnotationModal(true);
  };

  const handleSubmitAnnotation = async (comment: string) => {
    if (!selectedSearchResultId) return;

    await addCommentMutation({
      topicId: topicId as Id<"topics">,
      searchResultId: selectedSearchResultId,
      content: comment,
      highlightedText: selectedTextForAnnotation,
    });
  };

  const handleActiveAnnotationChange = (highlightedText: string | null) => {
    setActiveAnnotationText(highlightedText);
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
                      commentCount={result.commentCount}
                      onClick={handleResultClick}
                      activeAnnotationText={
                        selectedSearchResultId === result._id
                          ? activeAnnotationText || undefined
                          : undefined
                      }
                      onCreateAnnotation={
                        selectedSearchResultId === result._id
                          ? handleCreateAnnotation
                          : undefined
                      }
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
          <Suspense
            fallback={
              <CommentsPanelSkeleton
                onClose={() => setSelectedSearchResultId(null)}
              />
            }
          >
            <TopicCommentsPanel
              isOpen={true}
              onClose={() => setSelectedSearchResultId(null)}
              topicId={topicId as Id<"topics">}
              searchResultId={selectedSearchResultId}
              onActiveAnnotationChange={handleActiveAnnotationChange}
            />
          </Suspense>
        </div>
      )}

      {/* Annotation Modal */}
      <CreateAnnotationModal
        open={showAnnotationModal}
        onClose={() => setShowAnnotationModal(false)}
        selectedText={selectedTextForAnnotation}
        onSubmit={handleSubmitAnnotation}
      />
    </div>
  );
}
