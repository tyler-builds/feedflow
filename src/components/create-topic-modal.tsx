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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCustomer, CheckoutDialog } from "autumn-js/react";

const FREQUENCY_OPTIONS = [
  { label: "Every hour", value: "1h" },
  { label: "Every 6 hours", value: "6h" },
  { label: "Every 12 hours", value: "12h" },
  { label: "Once daily", value: "24h" },
] as const;

type FrequencyValue = "1h" | "6h" | "12h" | "24h";

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
  const [frequency, setFrequency] = useState<FrequencyValue>("24h");
  const [isLimitError, setIsLimitError] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const createTopic = useAction(api.topicsActions.createTopic);
  const { checkout } = useCustomer();

  const handleCreate = async () => {
    setError("");
    setIsLimitError(false);
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
      await createTopic({ title, description, frequency });

      // Reset form
      if (titleRef.current) titleRef.current.value = "";
      if (descriptionRef.current) descriptionRef.current.value = "";
      setFrequency("24h");

      // Close modal
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to create topic:", err);
      const errorMessage =
        err instanceof Error
          ? err.message.includes("You've reached your plan's topic limit")
            ? "You've reached your plan's topic limit"
            : err.message
          : "Failed to create topic";
      setError(errorMessage);

      // Check if this is a limit error
      if (errorMessage.includes("limit") || errorMessage.includes("upgrade")) {
        setIsLimitError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    checkout({
      productId: "basic",
      dialog: CheckoutDialog,
    });
  };

  const handleCancel = () => {
    setError("");
    setIsLimitError(false);
    if (titleRef.current) titleRef.current.value = "";
    if (descriptionRef.current) descriptionRef.current.value = "";
    setFrequency("24h");
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

          <div className="space-y-2">
            <Label htmlFor="frequency">Update Frequency</Label>
            <Select
              value={frequency}
              onValueChange={(value) => setFrequency(value as FrequencyValue)}
              disabled={loading}
            >
              <SelectTrigger id="frequency" className="w-full">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              {isLimitError && (
                <Button
                  onClick={handleUpgrade}
                  className="mt-3 w-full"
                  variant="default"
                >
                  Upgrade Plan
                </Button>
              )}
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
