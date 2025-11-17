import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CreateAnnotationModalProps {
  open: boolean;
  onClose: () => void;
  selectedText: string;
  onSubmit: (comment: string) => void;
}

export function CreateAnnotationModal({
  open,
  onClose,
  selectedText,
  onSubmit,
}: CreateAnnotationModalProps) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(comment.trim());
      setComment("");
      onClose();
    } catch (error) {
      console.error("Failed to create annotation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setComment("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Annotation</DialogTitle>
          <DialogDescription>
            Add your comment about the selected text
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Selected Text
            </label>
            <div className="rounded-md border bg-muted/50 p-3">
              <p className="text-sm italic">"{selectedText}"</p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Your Comment
            </label>
            <Textarea
              placeholder="Add your annotation..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px] resize-none"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!comment.trim() || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Annotation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
