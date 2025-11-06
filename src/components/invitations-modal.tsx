import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
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
import { Check, X, Mail } from "lucide-react";

interface InvitationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvitationsModal({
  open,
  onOpenChange,
}: InvitationsModalProps) {
  // Get pending invitations for current user
  const { data: invitations } = useQuery(
    convexQuery(api.invitations.getUserInvitations, {}),
  );

  const { handleAccept, handleDecline } = useInvitationActions({
    onSuccess: () => onOpenChange(false),
  });

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
          {!invitations || invitations.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No pending invitations</p>
              <p className="text-sm text-muted-foreground mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            invitations.map((invitation: any) => (
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
                      <p>
                        Invited{" "}
                        {new Date(invitation.createdAt).toLocaleDateString()}
                      </p>
                      <p>
                        Expires{" "}
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </p>
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
