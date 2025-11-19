import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { useInvitationActions } from "@/hooks/use-invitation-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, Mail, AlertCircle } from "lucide-react";

interface InvitationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type InvitationWithTeam = Doc<"teamInvitations"> & {
  team: { name: string; logoUrl?: string } | null;
};

export function InvitationsModal({
  open,
  onOpenChange,
}: InvitationsModalProps) {
  // Get pending invitations for current user
  const {
    data: invitations,
    isLoading,
    error,
  } = useQuery(convexQuery(api.invitations.getUserInvitations, {}));

  const { handleAccept, handleDecline } = useInvitationActions({
    onSuccess: () => onOpenChange(false),
  });

  const formatDate = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Team Invitations</DialogTitle>
          <DialogDescription>
            Review and respond to team invitations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isLoading ? (
            // Loading state
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                      </div>
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            // Error state
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive/50 mb-4" />
              <p className="text-muted-foreground font-medium">
                Failed to load invitations
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error
                  ? error.message
                  : "Please try again later"}
              </p>
            </div>
          ) : !invitations || invitations.length === 0 ? (
            // Empty state
            <div className="text-center py-8">
              <Mail className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No pending invitations</p>
              <p className="text-sm text-muted-foreground mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            // Data state
            invitations.map((invitation: InvitationWithTeam) => (
              <Card key={invitation._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {invitation.team?.name}
                      </CardTitle>
                      <CardDescription>
                        You've been invited to join this team
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{invitation.role}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <p>Invited {formatDate(invitation.createdAt)}</p>
                      <p>Expires {formatDate(invitation.expiresAt)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleAccept(invitation.token)}>
                        <Check className="mr-2 h-4 w-4" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDecline(invitation.token)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
