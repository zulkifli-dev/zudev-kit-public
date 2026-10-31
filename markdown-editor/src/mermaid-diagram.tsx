import { Button } from "@zudev/ui/components/button";
import { ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useId, useState } from "react";

export function MermaidDiagram({ source }: { source: string }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          securityLevel: "strict",
          startOnLoad: false,
          themeVariables: { fontSize: "18px" },
        });
        const result = await mermaid.render(`mermaid-${id}`, source);
        if (!cancelled) {
          setSvg(result.svg);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    void renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [id, source]);

  if (error) {
    return (
      <figure className="my-4 overflow-x-auto rounded-md border bg-muted/30 p-4">
        <figcaption className="mb-2 text-xs font-medium text-muted-foreground">
          Could not render this Mermaid diagram. Check its syntax.
        </figcaption>
        <pre className="m-0 whitespace-pre-wrap font-mono text-xs leading-5">
          {source}
        </pre>
      </figure>
    );
  }

  return (
    <figure className="my-4 w-full max-w-full rounded-md border bg-background">
      <div className="flex items-center justify-end gap-1 border-b bg-background/95 p-2">
        <span className="mr-1 text-xs tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          aria-label="Zoom out diagram"
          title="Zoom out"
          disabled={zoom <= 0.75}
          onClick={() => setZoom((current) => Math.max(0.75, current - 0.25))}
        >
          <ZoomOut className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          aria-label="Zoom in diagram"
          title="Zoom in"
          disabled={zoom >= 2.5}
          onClick={() => setZoom((current) => Math.min(2.5, current + 0.25))}
        >
          <ZoomIn className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="w-full overflow-x-auto p-4">
        {svg ? (
          <div
            role="img"
            aria-label="Mermaid diagram"
            className="mx-auto min-w-0 [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
            style={{ width: `${zoom * 100}%` }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <figcaption className="text-xs text-muted-foreground">
            Rendering diagram…
          </figcaption>
        )}
      </div>
    </figure>
  );
}
