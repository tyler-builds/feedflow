import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TopicComment, type Comment } from "./topic-comment";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Dummy data for comments
const dummyComments: Comment[] = [
  {
    id: "1",
    author: {
      name: "Sarah Johnson",
      initials: "SJ",
    },
    content:
      "This is a great topic! I've been thinking about this for a while and would love to discuss further.",
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
  },
  {
    id: "2",
    author: {
      name: "Mike Chen",
      initials: "MC",
    },
    content:
      "I agree with the approach outlined here. We should definitely consider implementing this in our next sprint.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: "3",
    author: {
      name: "Emily Rodriguez",
      initials: "ER",
    },
    content:
      "Has anyone looked into the technical implications of this? I think we might need to do some research first.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
  },
  {
    id: "4",
    author: {
      name: "David Park",
      initials: "DP",
    },
    content:
      "I've done some preliminary research and this looks promising. Let me share what I found...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
  {
    id: "5",
    author: {
      name: "Lisa Anderson",
      initials: "LA",
    },
    content:
      "Can we schedule a meeting to discuss this in more detail? I have some questions about the implementation.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
  },
  {
    id: "6",
    author: {
      name: "James Wilson",
      initials: "JW",
    },
    content:
      "I've created a proof of concept that demonstrates this could work. Will share the link shortly.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
  },
  {
    id: "7",
    author: {
      name: "Hannah Jackson",
      initials: "HJ",
    },
    content: "Testing the new comment sections!",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
  },
];

interface TopicCommentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TopicCommentsPanel({
  isOpen,
  onClose,
}: TopicCommentsPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full border-l bg-background mt-10">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Comments</h2>
          <span className="text-sm text-muted-foreground">
            ({dummyComments.length})
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

      {/* Comments List */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-4 pb-8">
          <div className="space-y-3 py-4">
            {dummyComments.map((comment) => (
              <TopicComment key={comment.id} comment={comment} />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
