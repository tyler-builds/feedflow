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
  MessageSquare,
  Highlighter as HighlighterIcon,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Highlighter from "react-highlight-words";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

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
  commentCount: number;
  onClick?: (searchResultId: Id<"searchResults">) => void;
  activeAnnotationText?: string;
  onCreateAnnotation?: (highlightedText: string) => void;
}

export function ScrapedResultItem({
  result,
  commentCount,
  onClick,
  activeAnnotationText,
  onCreateAnnotation,
}: ScrapedResultItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAnnotateButton, setShowAnnotateButton] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const summaryRef = useRef<HTMLDivElement>(null);
  const keyPointsRef = useRef<HTMLDivElement>(null);
  const isNews = result.type === "news";

  const hasSummary = !!result.summary;
  const hasKeyPoints = !!(result.keyPoints && result.keyPoints.length > 0);
  const hasExpandableContent = hasSummary || hasKeyPoints;

  // Auto-expand when there's an active annotation
  useEffect(() => {
    if (activeAnnotationText && !isOpen) {
      setIsOpen(true);
    }
  }, [activeAnnotationText, isOpen]);

  const handleTextSelection = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (text && text.length > 0) {
      // Check if the selection is within summary or key points
      const range = selection?.getRangeAt(0);
      const container = range?.commonAncestorContainer;

      const isInSummary = summaryRef.current?.contains(container as Node);
      const isInKeyPoints = keyPointsRef.current?.contains(container as Node);

      if (isInSummary || isInKeyPoints) {
        setSelectedText(text);

        // Get the position of the selection to show the button
        const rect = range?.getBoundingClientRect();
        if (rect) {
          setButtonPosition({
            top: rect.bottom + window.scrollY + 5,
            left: rect.left + window.scrollX + rect.width / 2,
          });
        }
        setShowAnnotateButton(true);
      }
    } else {
      setShowAnnotateButton(false);
    }
  };

  const handleCreateAnnotation = () => {
    if (selectedText && onCreateAnnotation) {
      onCreateAnnotation(selectedText);
      setShowAnnotateButton(false);
      setSelectedText("");
      window.getSelection()?.removeAllRanges();
    }
  };

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
            <Badge variant="outline" className="gap-1">
              <MessageSquare className="h-3 w-3" />
              {commentCount}
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
              <div
                className="pt-2 border-t"
                ref={summaryRef}
                onMouseUp={handleTextSelection}
              >
                <h4 className="text-xs font-semibold mb-1.5 text-muted-foreground uppercase">
                  Summary
                </h4>
                <p className="text-sm">
                  {activeAnnotationText ? (
                    <Highlighter
                      searchWords={[activeAnnotationText]}
                      textToHighlight={result.summary}
                      highlightClassName="bg-yellow-200 dark:bg-yellow-800"
                    />
                  ) : (
                    result.summary
                  )}
                </p>
              </div>
            )}

            {/* All key points when expanded */}
            {result.keyPoints && result.keyPoints.length > 0 && (
              <div
                className="pt-2 border-t"
                ref={keyPointsRef}
                onMouseUp={handleTextSelection}
              >
                <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase">
                  Key Points
                </h4>
                <ul className="space-y-1.5 text-sm">
                  {result.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary shrink-0">•</span>
                      <span>
                        {activeAnnotationText ? (
                          <Highlighter
                            searchWords={[activeAnnotationText]}
                            textToHighlight={point}
                            highlightClassName="bg-yellow-200 dark:bg-yellow-800"
                          />
                        ) : (
                          point
                        )}
                      </span>
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

      {/* Floating annotate button */}
      {showAnnotateButton && (
        <div
          className="fixed z-50"
          style={{
            top: `${buttonPosition.top}px`,
            left: `${buttonPosition.left}px`,
            transform: "translateX(-50%)",
          }}
        >
          <Button
            size="sm"
            variant="default"
            onClick={handleCreateAnnotation}
            className="shadow-lg"
          >
            <HighlighterIcon className="h-3 w-3 mr-1" />
            Annotate
          </Button>
        </div>
      )}
    </Collapsible>
  );
}
