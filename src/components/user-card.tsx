import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { LogOut, Mail, ChevronUp } from "lucide-react";
import { InvitationsModal } from "./invitations-modal";

export function UserCard() {
  const navigate = useNavigate();
  const [invitationsModalOpen, setInvitationsModalOpen] = useState(false);
  const { data: session } = authClient.useSession();

  // Get pending invitations count
  const { data: invitations } = useQuery(
    convexQuery(api.invitations.getUserInvitations, {}),
  );
  const pendingCount = invitations?.length ?? 0;

  const user = session?.user;

  // Get user initials for avatar fallback
  const getInitials = (name?: string, email?: string) => {
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

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          navigate({ to: "/login" });
        },
      },
    });
  };

  if (!user) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton className="h-14 hover:bg-sidebar-accent">
            <div className="flex items-center gap-3 w-full">
              <div className="relative">
                <Avatar className="h-9 w-9">
                  {user.image && (
                    <AvatarImage src={user.image} alt={user.name || "User"} />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                {pendingCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {pendingCount}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col items-start flex-1 text-left overflow-hidden">
                <span className="font-medium text-sm truncate w-full">
                  {user.name || "User"}
                </span>
                <span className="text-xs text-muted-foreground truncate w-full">
                  {user.email}
                </span>
              </div>
              <ChevronUp className="ml-auto h-4 w-4 opacity-50" />
            </div>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
        >
          <DropdownMenuItem onClick={() => setInvitationsModalOpen(true)}>
            <Mail className="mr-2 h-4 w-4" />
            <span>Invitations</span>
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {pendingCount}
              </Badge>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <InvitationsModal
        open={invitationsModalOpen}
        onOpenChange={setInvitationsModalOpen}
      />
    </>
  );
}
