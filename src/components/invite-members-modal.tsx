import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InviteMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: Id<"teams">;
}

export function InviteMembersModal({
  open,
  onOpenChange,
  teamId,
}: InviteMembersModalProps) {
  const [emails, setEmails] = useState<string[]>([""]);
  const [role, setRole] = useState<"member" | "admin" | "owner">("member");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const createInvitation = useMutation(api.invitations.createInvitation);

  const addEmailField = () => {
    setEmails([...emails, ""]);
  };

  const removeEmailField = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Filter out empty emails and validate
    const validEmails = emails.filter((email) => email.trim() !== "");

    if (validEmails.length === 0) {
      setError("Please enter at least one email address");
      return;
    }

    const invalidEmails = validEmails.filter((email) => !validateEmail(email));
    if (invalidEmails.length > 0) {
      setError("Please enter valid email addresses");
      return;
    }

    setIsLoading(true);
    try {
      // Send invitations
      await Promise.all(
        validEmails.map((email) =>
          createInvitation({
            teamId,
            email: email.trim(),
            role,
          }),
        ),
      );

      // Reset form
      setEmails([""]);
      setRole("member");
      setError("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to send invitations:", error);
      setError(
        error.message || "Failed to send invitations. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Invite team members</DialogTitle>
            <DialogDescription>
              Invite people to join your team. They'll receive an in-app
              invitation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Email addresses</Label>
              {emails.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={email}
                    onChange={(e) => updateEmail(index, e.target.value)}
                    disabled={isLoading}
                  />
                  {emails.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeEmailField(index)}
                      disabled={isLoading}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEmailField}
                disabled={isLoading}
                className="w-fit"
              >
                + Add another
              </Button>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={role}
                onValueChange={(value: any) => setRole(value)}
                disabled={isLoading}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin (coming soon)</SelectItem>
                  <SelectItem value="owner">Owner (coming soon)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Role permissions will be implemented in a future update
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send invitations"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
