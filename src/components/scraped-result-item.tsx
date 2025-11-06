import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ExternalLink,
  Globe,
  Newspaper,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";

interface ScrapedResultItemProps {
  result: {
    _id: Id<"searchResults">;
    type: "web" | "news";
    title: string;
    url: string;
    position: number;
    description?: string;
    summary?: string;
    keyPoints?: string[];
    imageUrl?: string;
    date?: string;
    favicon?: string;
  };
  onClick?: (searchResultId: Id<"searchResults">) => void;
}

export function ScrapedResultItem({ result, onClick }: ScrapedResultItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isNews = result.type === "news";

  const hasSummary = !!result.summary;
  const hasKeyPoints = !!(result.keyPoints && result.keyPoints.length > 0);
  const hasExpandableContent = hasSummary || hasKeyPoints;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(result._id)}
    >
      {/* Header - Clickable trigger */}
      <CollapsibleTrigger
        className="w-full cursor-pointer hover:bg-accent/50 transition-colors rounded-md p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <h3 className="text-base font-semibold leading-tight flex-1 text-left">
                {result.title}
              </h3>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-primary transition-colors" />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={isNews ? "secondary" : "outline"}>
              {isNews ? (
                <>
                  <Newspaper className="h-3 w-3 mr-1" />
                  News
                </>
              ) : (
                <>
                  <Globe className="h-3 w-3 mr-1" />
                  Web
                </>
              )}
            </Badge>
            {hasExpandableContent && (
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            )}
          </div>
        </div>
      </CollapsibleTrigger>

      {/* Content */}
      <div className="space-y-3 mt-3 mx-4 mb-4">
        {/* Always visible: Description/Snippet */}
        {result.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {result.description}
          </p>
        )}

        {/* Collapsible content: Summary, Key Points, Image */}
        {hasExpandableContent && (
          <CollapsibleContent className="space-y-3">
            {/* News thumbnail in expanded view */}
            {isNews && result.imageUrl && (
              <div>
                <img
                  src={result.imageUrl}
                  alt={result.title}
                  className="w-full max-w-xs rounded-md object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}

            {/* Full summary - no line clamp when expanded */}
            {result.summary && (
              <div className="pt-2 border-t">
                <h4 className="text-xs font-semibold mb-1.5 text-muted-foreground uppercase">
                  Summary
                </h4>
                <p className="text-sm">{result.summary}</p>
              </div>
            )}

            {/* All key points when expanded */}
            {result.keyPoints && result.keyPoints.length > 0 && (
              <div className="pt-2 border-t">
                <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase">
                  Key Points
                </h4>
                <ul className="space-y-1.5 text-sm">
                  {result.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary shrink-0">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleContent>
        )}

        {/* Metadata footer - always visible */}
        <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground border-t">
          {!isNews && result.favicon && (
            <img
              src={result.favicon}
              alt=""
              className="h-3 w-3"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          {isNews && result.date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{result.date}</span>
            </div>
          )}
          <span className="truncate">{new URL(result.url).hostname}</span>
          <span className="text-muted-foreground/50">#{result.position}</span>
        </div>
      </div>
    </Collapsible>
  );
}
