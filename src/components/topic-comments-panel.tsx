import { ScrollArea } from "@/components/ui/scroll-area";
import { TopicComment } from "./topic-comment";
import { TopicCommentRepliesPanel } from "./topic-comment-replies-panel";
import { MessageSquare, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useMutation } from "convex/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface TopicCommentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: Id<"topics">;
  searchResultId: Id<"searchResults">;
}

export function TopicCommentsPanel({
  isOpen,
  onClose,
  topicId,
  searchResultId,
}: TopicCommentsPanelProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedComment, setSelectedComment] = useState<{
    id: Id<"comments">;
    authorName: string;
  } | null>(null);

  // Fetch comments for this search result
  const { data: comments } = useSuspenseQuery(
    convexQuery(api.comments.getCommentsBySearchResult, {
      topicId,
      searchResultId,
    }),
  );

  const addCommentMutation = useMutation(api.comments.addComment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addCommentMutation({
        topicId,
        searchResultId,
        content: newComment.trim(),
      });
      setNewComment("");
    } catch (error) {
      console.error("Failed to add comment:", error);
      alert(error instanceof Error ? error.message : "Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentClick = (
    commentId: Id<"comments">,
    authorName: string,
  ) => {
    setSelectedComment({ id: commentId, authorName });
  };

  const handleBackToComments = () => {
    setSelectedComment(null);
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full border rounded-xl bg-background relative overflow-hidden">
      {/* Main Comments Panel */}
      <div
        className={`absolute inset-0 flex flex-col transition-transform duration-300 ${
          selectedComment ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Comments</h2>
            <span className="text-sm text-muted-foreground">
              ({comments.length})
            </span>
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

        {/* Comments List - Scrollable */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-3 py-4">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No comments yet. Be the first to comment!
              </div>
            ) : (
              comments.map((comment) => (
                <TopicComment
                  key={comment._id}
                  comment={{
                    id: comment._id,
                    author: comment.author,
                    content: comment.content,
                    timestamp: new Date(comment.createdAt),
                    replyCount: comment.replyCount,
                  }}
                  onClick={() =>
                    handleCommentClick(comment._id, comment.author.name)
                  }
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Comment Input - Fixed at bottom */}
        <div className="border-t p-4 shrink-0">
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={isSubmitting}
                className="min-h-20 resize-none"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!newComment.trim() || isSubmitting}
                className="absolute bottom-3 right-1.5 h-8 w-8"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Responses Panel */}
      <div
        className={`absolute inset-0 flex flex-col transition-transform duration-300 ${
          selectedComment ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedComment && (
          <TopicCommentRepliesPanel
            commentId={selectedComment.id}
            authorName={selectedComment.authorName}
            topicId={topicId}
            searchResultId={searchResultId}
            onBack={handleBackToComments}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
