import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "convex/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InviteMembersModal } from "@/components/invite-members-modal";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, X, Users } from "lucide-react";
import { PricingTable } from "autumn-js/react";

export const Route = createFileRoute("/_authenticated/teams/settings")({
  component: TeamSettings,
});

function TeamSettings() {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Get current team
  const { data: currentTeam } = useSuspenseQuery(
    convexQuery(api.userSettings.getCurrentTeam, {}),
  );

  // Get team members
  const { data: members } = useSuspenseQuery(
    convexQuery(api.teamMembers.getTeamMembers, {}),
  );

  // Get pending invitations
  // Type cast needed due to @convex-dev/react-query type inference issue with optional parameters
  const { data: invitations } = useSuspenseQuery<Doc<"teamInvitations">[]>(
    convexQuery(api.invitations.getTeamInvitations, {
      status: "pending",
    }) as any,
  );

  const cancelInvitation = useMutation(api.invitations.cancelInvitation);
  const removeMember = useMutation(api.teamMembers.removeTeamMember);

  // Get user initials for avatar fallback
  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      const nameParts = name.split(" ");
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const handleCancelInvitation = async (invitationId: any) => {
    if (!confirm("Are you sure you want to cancel this invitation?")) return;

    try {
      await cancelInvitation({ invitationId });
    } catch (error) {
      console.error("Failed to cancel invitation:", error);
      alert("Failed to cancel invitation");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      await removeMember({ userId });
    } catch (error: any) {
      console.error("Failed to remove member:", error);
      alert(error.message || "Failed to remove member");
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{currentTeam.name}</h1>
            <p className="text-muted-foreground mt-1">
              Manage your team members and settings
            </p>
          </div>
          <Button onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite members
          </Button>
        </div>

        {/* Team Overview */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Team Members</CardTitle>
              </div>
              <CardDescription>People in your team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{members.length}</div>
              <p className="text-sm text-muted-foreground mt-2">
                Active team members
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Pending Invitations</CardTitle>
              </div>
              <CardDescription>
                Invitations waiting to be accepted
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{invitations.length}</div>
              <p className="text-sm text-muted-foreground mt-2">
                Awaiting response
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>People who are part of this team</CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet</p>
            ) : (
              <div className="space-y-3">
                {members.map((member: any) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {member.image && (
                          <AvatarImage
                            src={member.image}
                            alt={member.name || member.email || "User"}
                          />
                        )}
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(member.name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {member.name || member.email || "Unknown User"}
                        </p>
                        {member.name && member.email && (
                          <p className="text-xs text-muted-foreground">
                            {member.email}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Joined{" "}
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          member.role === "owner" ? "default" : "secondary"
                        }
                      >
                        {member.role}
                      </Badge>
                      {member.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.userId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              Invitations that haven't been accepted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pending invitations
              </p>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation: any) => (
                  <div
                    key={invitation._id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium text-sm">{invitation.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited{" "}
                        {new Date(invitation.createdAt).toLocaleDateString()} •
                        Expires{" "}
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{invitation.role}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation._id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <PricingTable />
      </div>

      {currentTeam && (
        <InviteMembersModal
          open={inviteModalOpen}
          onOpenChange={setInviteModalOpen}
          teamId={currentTeam._id}
        />
      )}
    </div>
  );
}
