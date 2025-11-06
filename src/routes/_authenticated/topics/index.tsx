import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "convex/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateTopicModal } from "@/components/create-topic-modal";
import { Plus, Trash2, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/topics/")({
  component: TopicsPage,
});

function TopicsPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Get all topics
  const { data: topics } = useSuspenseQuery<
    Array<
      Doc<"topics"> & {
        creatorName: string | null;
        creatorEmail: string | null;
      }
    >
  >(convexQuery(api.topicsDb.getTopics, {}) as any);

  const deleteTopic = useMutation(api.topicsDb.deleteTopic);

  const handleDelete = async (topicId: any) => {
    if (!confirm("Are you sure you want to delete this topic?")) return;

    try {
      await deleteTopic({ topicId });
    } catch (error: any) {
      console.error("Failed to delete topic:", error);
      alert(error.message || "Failed to delete topic");
    }
  };

  return (
    <div className="flex-1 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Topics</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage discussion topics for your team
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Topic
          </Button>
        </div>

        {topics.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No topics yet</CardTitle>
              <CardDescription>
                Get started by creating your first topic
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Topic
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <Card
                key={topic._id}
                className="flex flex-col group hover:shadow-lg transition-shadow"
              >
                <Link
                  to="/topics/$topicId"
                  params={{ topicId: topic._id }}
                  className="flex flex-col flex-1"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        {topic.title}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDelete(topic._id);
                        }}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {topic.description}
                    </p>

                    <div className="mt-auto pt-4 border-t space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Created{" "}
                            {new Date(topic.createdAt).toLocaleDateString()}
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
                      {topic.creatorName && (
                        <p className="text-xs text-muted-foreground">
                          By {topic.creatorName}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateTopicModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  );
}
