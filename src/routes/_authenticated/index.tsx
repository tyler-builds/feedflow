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
import { StatCard } from "@/components/StatCard";
import {
  Mail,
  FolderOpen,
  FileSearch,
  MessageSquare,
  Users,
  Clock,
} from "lucide-react";

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

  // Get team analytics
  const { data: analytics } = useQuery(
    convexQuery(api.analytics.getTeamAnalytics, {}),
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

        {/* Analytics Stats Grid */}
        {analytics && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Total Topics"
              value={analytics.totalTopics}
              description="All topics in your team"
              icon={FolderOpen}
              href="/topics"
            />
            <StatCard
              title="Active Topics"
              value={analytics.activeTopics}
              description="Currently being tracked"
              icon={Clock}
              href="/topics"
            />
            <StatCard
              title="Search Results"
              value={analytics.totalSearchResults}
              description="Total results collected"
              icon={FileSearch}
            />
            <StatCard
              title="Comments"
              value={analytics.totalComments}
              description="Team discussions"
              icon={MessageSquare}
            />
            <StatCard
              title="Team Members"
              value={analytics.memberCount}
              description="Active collaborators"
              icon={Users}
              href="/teams/settings"
            />
            {analytics.failedTopics > 0 && (
              <StatCard
                title="Failed Topics"
                value={analytics.failedTopics}
                description="Needs attention"
                icon={FolderOpen}
                href="/topics"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
