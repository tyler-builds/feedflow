import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare } from "lucide-react";

export interface Comment {
  id: string;
  author: {
    name: string;
    avatar?: string;
    initials: string;
  };
  content: string;
  timestamp: Date;
  replyCount?: number;
}

interface TopicCommentProps {
  comment: Comment;
  onClick?: () => void;
}

export function TopicComment({ comment, onClick }: TopicCommentProps) {
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div
      className={`rounded-lg border bg-card p-3 shadow-sm transition-all ${
        onClick
          ? "cursor-pointer hover:shadow-md hover:border-primary/50"
          : "hover:shadow-md"
      }`}
      onClick={onClick}
    >
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
          <AvatarFallback className="text-xs">
            {comment.author.initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{comment.author.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatTimestamp(comment.timestamp)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{comment.content}</p>
          {comment.replyCount !== undefined && comment.replyCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
              <MessageSquare className="h-3 w-3" />
              <span>
                {comment.replyCount}{" "}
                {comment.replyCount === 1 ? "reply" : "replies"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
