import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Settings, Users, MessageSquare } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/")({
  component: App,
});

function App() {
  // Get current team with suspense (guaranteed to be loaded)
  const { data: currentTeam } = useSuspenseQuery(
    convexQuery(api.userSettings.getCurrentTeam, {}),
  );

  // Get pending invitations
  const { data: invitations } = useQuery(
    convexQuery(api.invitations.getUserInvitations, {}),
  );

  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">
            Welcome to {currentTeam.name}
          </h1>
          <p className="text-muted-foreground text-lg">
            A collaborative platform for teams to create and discuss topics
            together.
          </p>
        </div>

        {/* Pending Invitations Banner */}
        {invitations && invitations.length > 0 && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <CardTitle>Pending Invitations</CardTitle>
                </div>
                <Badge variant="default">{invitations.length}</Badge>
              </div>
              <CardDescription>
                You have {invitations.length} pending team{" "}
                {invitations.length === 1 ? "invitation" : "invitations"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/invitations">View Invitations</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Team Settings</CardTitle>
              </div>
              <CardDescription>Manage your team and members</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/teams/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Open Team Settings
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Topics</CardTitle>
              </div>
              <CardDescription>
                Create and discuss topics with your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/topics">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Browse Topics
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Your team collaboration workspace is ready
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Here's what you can do right now:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>
                <Link to="/topics" className="text-primary hover:underline">
                  Create and manage topics
                </Link>{" "}
                for your team to discuss
              </li>
              <li>Invite team members to join your workspace</li>
              <li>
                Switch between teams using the team switcher in the sidebar
              </li>
              <li>
                <Link
                  to="/teams/settings"
                  className="text-primary hover:underline"
                >
                  Manage team settings and members
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
