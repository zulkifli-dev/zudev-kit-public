import { markdown } from "@codemirror/lang-markdown";
import CodeMirror from "@uiw/react-codemirror";
import { Button } from "@zudev/ui/components/button";
import {
  Bold,
  Code2,
  GitBranch,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
} from "react";

export type MarkdownToolbarTool =
  | "bold"
  | "italic"
  | "strikethrough"
  | "h1"
  | "h2"
  | "h3"
  | "link"
  | "image"
  | "bullet-list"
  | "ordered-list"
  | "quote"
  | "mermaid"
  | "code";

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  tools: MarkdownToolbarTool[];
  height?: string;
  className?: string;
}

type CodeMirrorView = Parameters<
  NonNullable<ComponentProps<typeof CodeMirror>["onCreateEditor"]>
>[0];

const toolDetails: Record<MarkdownToolbarTool, { label: string; icon: LucideIcon }> = {
  bold: { label: "Bold", icon: Bold },
  italic: { label: "Italic", icon: Italic },
  strikethrough: { label: "Strikethrough", icon: Strikethrough },
  h1: { label: "Heading 1", icon: Heading1 },
  h2: { label: "Heading 2", icon: Heading2 },
  h3: { label: "Heading 3", icon: Heading3 },
  link: { label: "Link", icon: Link2 },
  image: { label: "Image", icon: ImagePlus },
  "bullet-list": { label: "Bulleted list", icon: List },
  "ordered-list": { label: "Numbered list", icon: ListOrdered },
  quote: { label: "Quote", icon: Quote },
  mermaid: { label: "Mermaid diagram", icon: GitBranch },
  code: { label: "Code", icon: Code2 },
};

function inlineWrapper(view: CodeMirrorView, marker: string) {
  const { from, to } = view.state.selection.main;
  const before = view.state.doc.sliceString(0, from);
  const after = view.state.doc.sliceString(to);
  const opening = before.lastIndexOf(marker);
  const closing = after.indexOf(marker);
  if (opening < 0 || closing < 0 || before[opening - 1] === "\\") return null;
  if (marker === "*" && before.slice(opening - 2, opening + 1) === "***") {
    const tripleClose = after.indexOf("***");
    if (tripleClose >= 0) {
      return {
        openFrom: opening,
        closeFrom: to + tripleClose,
        closeTo: to + tripleClose + 1,
      };
    }
  }
  if (marker === "*" && (before[opening - 1] === "*" || after[closing + 1] === "*")) {
    return null;
  }

  const closeFrom = to + closing;
  return {
    openFrom: opening,
    closeFrom,
    closeTo: closeFrom + marker.length,
  };
}

function linkWrapper(view: CodeMirrorView) {
  const { from, to } = view.state.selection.main;
  const before = view.state.doc.sliceString(0, from);
  const after = view.state.doc.sliceString(to);
  const opening = before.lastIndexOf("[");
  const closing = after.indexOf("](");
  const destinationEnd = after.indexOf(")", closing + 2);

  if (
    opening < 0 ||
    before[opening - 1] === "!" ||
    before[opening - 1] === "\\" ||
    closing < 0 ||
    destinationEnd < 0
  ) {
    return null;
  }

  return {
    openFrom: opening,
    closeFrom: to + closing,
    closeTo: to + destinationEnd + 1,
  };
}

function activeHeading(view: CodeMirrorView) {
  const line = view.state.doc.lineAt(view.state.selection.main.from);
  const match = /^(#{1,3})\s/.exec(line.text);
  return match ? match[1].length : null;
}

function lineHasPrefix(view: CodeMirrorView, pattern: RegExp) {
  const line = view.state.doc.lineAt(view.state.selection.main.from);
  return pattern.test(line.text);
}

export function MarkdownEditor({
  value,
  onChange,
  tools,
  height = "380px",
  className = "",
}: MarkdownEditorProps) {
  const editorRef = useRef<CodeMirrorView | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const imageObjectUrls = useRef<string[]>([]);
  const [activeTools, setActiveTools] = useState<MarkdownToolbarTool[]>([]);

  useEffect(
    () => () => {
      for (const url of imageObjectUrls.current) URL.revokeObjectURL(url);
    },
    [],
  );

  function syncToolbar(view: CodeMirrorView) {
    const current = new Set<MarkdownToolbarTool>();
    if (inlineWrapper(view, "**")) current.add("bold");
    if (inlineWrapper(view, "*")) current.add("italic");
    if (inlineWrapper(view, "~~")) current.add("strikethrough");
    if (inlineWrapper(view, "`")) current.add("code");
    if (linkWrapper(view)) current.add("link");
    if (lineHasPrefix(view, /^\s*[-*+]\s+/)) current.add("bullet-list");
    if (lineHasPrefix(view, /^\s*\d+\.\s+/)) current.add("ordered-list");
    if (lineHasPrefix(view, /^>\s?/)) current.add("quote");
    const heading = activeHeading(view);
    if (heading === 1) current.add("h1");
    if (heading === 2) current.add("h2");
    if (heading === 3) current.add("h3");
    setActiveTools([...current]);
  }

  function toggleInline(marker: string, placeholder = "text") {
    const view = editorRef.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const wrapper = inlineWrapper(view, marker);
    if (wrapper) {
      view.dispatch({
        changes: [
          {
            from: wrapper.openFrom,
            to: wrapper.openFrom + marker.length,
            insert: "",
          },
          { from: wrapper.closeFrom, to: wrapper.closeTo, insert: "" },
        ],
        selection: {
          anchor: from - marker.length,
          head: to - marker.length,
        },
      });
      view.focus();
      return;
    }

    const selectedText = view.state.doc.sliceString(from, to);
    const content = selectedText || placeholder;
    const start = from + marker.length;
    view.dispatch({
      changes: { from, to, insert: `${marker}${content}${marker}` },
      selection: { anchor: start, head: start + content.length },
    });
    view.focus();
  }

  function toggleLines(prefix: string) {
    const view = editorRef.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const firstLine = view.state.doc.lineAt(from).number;
    const lastLine = view.state.doc.lineAt(to).number;
    const lines = Array.from({ length: lastLine - firstLine + 1 }, (_, index) =>
      view.state.doc.line(firstLine + index),
    );
    const matcher =
      prefix === "> "
        ? /^(\s*> ?)/
        : prefix === "- "
          ? /^(\s*)[-*+]\s+/
          : /^(\s*)\d+\.\s+/;
    const removePrefix = lines.every((line) => matcher.test(line.text));
    const changes = lines.flatMap((line) => {
      const match = matcher.exec(line.text);
      if (removePrefix && match) {
        return [{ from: line.from, to: line.from + match[0].length, insert: match[1] }];
      }
      if (!match) return [{ from: line.from, to: line.from, insert: prefix }];
      return [];
    });
    view.dispatch({ changes });
    view.focus();
  }

  function toggleLink() {
    const view = editorRef.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const wrapper = linkWrapper(view);
    if (wrapper) {
      view.dispatch({
        changes: [
          { from: wrapper.openFrom, to: wrapper.openFrom + 1, insert: "" },
          { from: wrapper.closeFrom, to: wrapper.closeTo, insert: "" },
        ],
        selection: { anchor: from - 1, head: to - 1 },
      });
      view.focus();
      return;
    }

    const text = view.state.doc.sliceString(from, to) || "link text";
    const start = from + 1;
    view.dispatch({
      changes: { from, to, insert: `[${text}](url)` },
      selection: { anchor: start, head: start + text.length },
    });
    view.focus();
  }

  function setHeading(level: 1 | 2 | 3) {
    const view = editorRef.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const start = view.state.doc.lineAt(from).from;
    const end = view.state.doc.lineAt(to).to;
    const selectedLines = view.state.doc.sliceString(start, end);
    const marker = "#".repeat(level);
    const lines = selectedLines.split("\n");
    const removeHeading = lines.every((line) => line.startsWith(`${marker} `));
    const formatted = lines
      .map((line) => {
        const content = line.replace(/^#{1,6}\s+/, "");
        return removeHeading ? content : `${marker} ${content}`;
      })
      .join("\n");
    view.dispatch({
      changes: { from: start, to: end, insert: formatted },
      selection: {
        anchor: Math.min(start + marker.length + 1, start + formatted.length),
        head: start + formatted.length,
      },
    });
    view.focus();
  }

  function insertImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    const view = editorRef.current;
    event.currentTarget.value = "";
    if (!file || !view) return;

    const url = URL.createObjectURL(file);
    imageObjectUrls.current.push(url);
    const alt = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .replace(/[\\[\]]/g, "\\$&");
    const { from, to } = view.state.selection.main;
    const before = view.state.doc.sliceString(0, from);
    const after = view.state.doc.sliceString(to);
    const prefix = before && !before.endsWith("\n\n") ? "\n\n" : "";
    const suffix = after && !after.startsWith("\n\n") ? "\n\n" : "";
    const image = `![${alt || "Article image"}](${url})`;
    const insertion = `${prefix}${image}${suffix}`;

    view.dispatch({
      changes: { from, to, insert: insertion },
      selection: { anchor: from + insertion.length },
    });
    view.focus();
  }

  function insertMermaid() {
    const view = editorRef.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const before = view.state.doc.sliceString(0, from);
    const after = view.state.doc.sliceString(to);
    const prefix = before && !before.endsWith("\n\n") ? "\n\n" : "";
    const suffix = after && !after.startsWith("\n\n") ? "\n\n" : "";
    const diagram = "```mermaid\nflowchart TD\n  A[Start] --> B[End]\n```";
    const insertion = `${prefix}${diagram}${suffix}`;

    view.dispatch({
      changes: { from, to, insert: insertion },
      selection: { anchor: from + prefix.length + diagram.length },
    });
    view.focus();
  }

  function handleAction(tool: MarkdownToolbarTool) {
    switch (tool) {
      case "bold":
        toggleInline("**");
        break;
      case "italic":
        toggleInline("*");
        break;
      case "strikethrough":
        toggleInline("~~");
        break;
      case "h1":
        setHeading(1);
        break;
      case "h2":
        setHeading(2);
        break;
      case "h3":
        setHeading(3);
        break;
      case "link":
        toggleLink();
        break;
      case "image":
        imageInputRef.current?.click();
        break;
      case "mermaid":
        insertMermaid();
        break;
      case "bullet-list":
        toggleLines("- ");
        break;
      case "ordered-list":
        toggleLines("1. ");
        break;
      case "quote":
        toggleLines("> ");
        break;
      case "code":
        toggleInline("`", "code");
        break;
    }
  }

  return (
    <div className={`min-w-0 w-full max-w-full overflow-hidden rounded-md border bg-background ${className}`}>
      <div
        aria-label="Markdown formatting toolbar"
        className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-1"
        role="toolbar"
      >
        {tools.map((tool) => {
          const { label, icon: Icon } = toolDetails[tool];
          const active = activeTools.includes(tool);

          return (
            <Button
              key={tool}
              type="button"
              variant="ghost"
              size="icon"
              className={`size-8 text-muted-foreground ${active ? "bg-accent text-accent-foreground" : ""}`}
              aria-label={label}
              aria-pressed={active}
              title={label}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleAction(tool)}
            >
              <Icon className="size-4" aria-hidden="true" />
            </Button>
          );
        })}
      </div>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Choose article image"
        onChange={insertImage}
      />
      <CodeMirror
        aria-label="Article body Markdown editor"
        value={value}
        height={height}
        width="100%"
        extensions={[markdown()]}
        onChange={onChange}
        onCreateEditor={(view) => {
          editorRef.current = view;
          syncToolbar(view);
        }}
        onUpdate={(update) => {
          if (update.selectionSet || update.docChanged) syncToolbar(update.view);
        }}
        className="max-w-full bg-background text-sm [&_.cm-editor]:max-w-full [&_.cm-editor]:outline-none [&_.cm-scroller]:overflow-auto"
      />
    </div>
  );
}
