import { useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CreateTopicModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTopicModal({
  open,
  onOpenChange,
}: CreateTopicModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const createTopic = useAction(api.topicsActions.createTopic);

  const handleCreate = async () => {
    setError("");
    setLoading(true);

    const title = titleRef.current?.value?.trim() || "";
    const description = descriptionRef.current?.value?.trim() || "";

    if (!title) {
      setError("Title is required");
      setLoading(false);
      return;
    }

    if (!description) {
      setError("Description is required");
      setLoading(false);
      return;
    }

    try {
      await createTopic({ title, description });

      // Reset form
      if (titleRef.current) titleRef.current.value = "";
      if (descriptionRef.current) descriptionRef.current.value = "";

      // Close modal
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to create topic:", err);
      setError(err instanceof Error ? err.message : "Failed to create topic");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setError("");
    if (titleRef.current) titleRef.current.value = "";
    if (descriptionRef.current) descriptionRef.current.value = "";
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Topic</DialogTitle>
          <DialogDescription>
            Create a new topic for your team to discuss and collaborate on.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              ref={titleRef}
              placeholder="Enter topic title"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              ref={descriptionRef}
              placeholder="Enter topic description"
              disabled={loading}
              rows={5}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "Creating..." : "Create Topic"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
