import { ScrollArea } from "@/components/ui/scroll-area";
import { TopicComment } from "./topic-comment";
import { MessageSquare, X, Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useMutation } from "convex/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface TopicCommentRepliesPanelProps {
  commentId: Id<"comments">;
  authorName: string;
  topicId: Id<"topics">;
  searchResultId: Id<"searchResults">;
  onBack: () => void;
  onClose: () => void;
}

export function TopicCommentRepliesPanel({
  commentId,
  topicId,
  searchResultId,
  onBack,
  onClose,
}: TopicCommentRepliesPanelProps) {
  const [newReply, setNewReply] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch the parent comment
  const { data: comments } = useSuspenseQuery(
    convexQuery(api.comments.getCommentsBySearchResult, {
      topicId,
      searchResultId,
    }),
  );

  const parentComment = comments.find((c) => c._id === commentId);

  // Fetch replies for this comment
  const { data: replies } = useSuspenseQuery(
    convexQuery(api.comments.getCommentReplies, {
      commentId,
    }),
  );

  const addCommentMutation = useMutation(api.comments.addComment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addCommentMutation({
        topicId,
        searchResultId,
        content: newReply.trim(),
        parentCommentId: commentId,
      });
      setNewReply("");
    } catch (error) {
      console.error("Failed to add reply:", error);
      alert(error instanceof Error ? error.message : "Failed to add reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <MessageSquare className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Responses</h2>
          <span className="text-sm text-muted-foreground">
            ({replies.length})
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

      {/* Selected Comment */}
      {parentComment && (
        <div className="px-4 pt-4 pb-2 border-b bg-muted/30">
          <TopicComment
            comment={{
              id: parentComment._id,
              author: parentComment.author,
              content: parentComment.content,
              timestamp: new Date(parentComment.createdAt),
            }}
          />
        </div>
      )}

      {/* Replies List - Scrollable */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-3 py-4">
          {replies.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No replies yet. Be the first to reply!
            </div>
          ) : (
            replies.map((reply) => (
              <TopicComment
                key={reply._id}
                comment={{
                  id: reply._id,
                  author: reply.author,
                  content: reply.content,
                  timestamp: new Date(reply.createdAt),
                }}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Reply Input - Fixed at bottom */}
      <div className="border-t p-4 shrink-0">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Textarea
              placeholder="Reply to comment..."
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              disabled={isSubmitting}
              className="min-h-20 resize-none"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newReply.trim() || isSubmitting}
              className="absolute bottom-3 right-1.5 h-8 w-8"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
