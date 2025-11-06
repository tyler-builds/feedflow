import { useState } from "react";
import { ChevronsUpDown, Plus } from "lucide-react";
import { useMutation } from "convex/react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreateTeamModal } from "./create-team-modal";

export function TeamSwitcher() {
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Get current team
  const { data: currentTeam } = useQuery(
    convexQuery(api.userSettings.getCurrentTeam, {}),
  );

  // Get all teams
  const { data: teams } = useQuery(convexQuery(api.teams.getUserTeams, {}));

  // Mutation to set current team
  const setCurrentTeam = useMutation(api.userSettings.setCurrentTeam);

  // Get initials from team name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton className="h-12 hover:bg-sidebar-accent">
                <div className="flex items-center gap-2 flex-1">
                  <Avatar className="h-8 w-8 rounded-md">
                    {currentTeam?.logoUrl && (
                      <AvatarImage
                        src={currentTeam.logoUrl}
                        alt={currentTeam.name}
                      />
                    )}
                    <AvatarFallback className="rounded-md bg-primary text-primary-foreground">
                      {currentTeam ? getInitials(currentTeam.name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start flex-1 text-left">
                    <span className="font-medium text-sm">
                      {currentTeam?.name}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50" />
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
              align="start"
            >
              <DropdownMenuLabel>Teams</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {teams?.map((team: any) => (
                <DropdownMenuItem
                  key={team._id}
                  onClick={() => setCurrentTeam({ teamId: team._id })}
                  className="gap-2"
                >
                  <Avatar className="h-6 w-6 rounded-md">
                    {team.logoUrl && (
                      <AvatarImage src={team.logoUrl} alt={team.name} />
                    )}
                    <AvatarFallback className="rounded-md bg-primary text-primary-foreground text-xs">
                      {getInitials(team.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1">{team.name}</span>
                  {currentTeam?._id === team._id && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      ✓
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setCreateModalOpen(true)}
                className="gap-2"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md border bg-background">
                  <Plus className="h-4 w-4" />
                </div>
                <span>Create team</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <CreateTeamModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </>
  );
}
