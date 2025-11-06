import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface UseInvitationActionsOptions {
  onSuccess?: () => void;
}

export function useInvitationActions(options?: UseInvitationActionsOptions) {
  const navigate = useNavigate();
  const setCurrentTeam = useMutation(api.userSettings.setCurrentTeam);
  const acceptInvitation = useMutation(api.invitations.acceptInvitation);
  const declineInvitation = useMutation(api.invitations.declineInvitation);

  const handleAccept = async (token: string) => {
    try {
      const teamId = await acceptInvitation({ token });

      // Switch to the newly joined team
      await setCurrentTeam({ teamId });

      // Call optional success callback (e.g., to close modal)
      options?.onSuccess?.();

      // Navigate to home
      navigate({ to: "/" });
    } catch (error: any) {
      console.error("Failed to accept invitation:", error);
      alert(error.message || "Failed to accept invitation");
    }
  };

  const handleDecline = async (token: string) => {
    if (!confirm("Are you sure you want to decline this invitation?")) return;

    try {
      await declineInvitation({ token });
    } catch (error: any) {
      console.error("Failed to decline invitation:", error);
      alert(error.message || "Failed to decline invitation");
    }
  };

  return {
    handleAccept,
    handleDecline,
  };
}
