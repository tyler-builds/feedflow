import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TopicComment, type Comment } from "./topic-comment";
import { MessageSquare } from "lucide-react";

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
];

export function TopicCommentsPanel() {
  return (
    <Card className="h-full flex flex-col mt-10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Comments</CardTitle>
          <span className="text-sm text-muted-foreground">
            ({dummyComments.length})
          </span>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="divide-y">
            {dummyComments.map((comment) => (
              <TopicComment key={comment.id} comment={comment} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
