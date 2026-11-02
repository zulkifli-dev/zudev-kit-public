import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownContent } from "./markdown-content.js";
import {
  MarkdownToolbar,
  type MarkdownToolbarTool,
} from "./markdown-toolbar.js";

function markdownFromInline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return "";

  const content = Array.from(node.childNodes, markdownFromInline).join("");
  switch (node.tagName) {
    case "STRONG":
    case "B":
      return `**${content}**`;
    case "EM":
    case "I":
      return `*${content}*`;
    case "DEL":
    case "S":
      return `~~${content}~~`;
    case "CODE":
      return `\`${content}\``;
    case "A":
      return `[${content}](${node.getAttribute("href") ?? ""})`;
    case "IMG":
      return `![${node.getAttribute("alt") ?? ""}](${node.getAttribute("src") ?? ""})`;
    case "BR":
      return "\n";
    default:
      return content;
  }
}

function markdownFromBlock(node: Node, depth = 0): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent?.trim() ?? "";
  if (!(node instanceof HTMLElement)) return "";

  const tag = node.tagName;
  const content = () =>
    Array.from(node.childNodes, markdownFromInline).join("").trim();
  if (/^H[1-6]$/.test(tag)) {
    return `${"#".repeat(Number(tag[1]))} ${content()}\n\n`;
  }
  if (tag === "P") return `${content()}\n\n`;
  if (tag === "PRE") {
    const code = node.querySelector("code");
    const language = code?.className.match(/language-([\w-]+)/)?.[1] ?? "";
    return `\`\`\`${language}\n${code?.textContent ?? node.textContent ?? ""}\n\`\`\`\n\n`;
  }
  if (tag === "BLOCKQUOTE") {
    const quoted = Array.from(node.children, (child) =>
      markdownFromBlock(child, depth).trimEnd(),
    ).join("\n");
    return `${quoted
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n")}\n\n`;
  }
  if (tag === "UL" || tag === "OL") {
    return `${Array.from(node.children, (item, index) => {
      const text = Array.from(item.childNodes)
        .filter(
          (child) =>
            !(
              child instanceof HTMLElement &&
              ["UL", "OL"].includes(child.tagName)
            ),
        )
        .map(markdownFromInline)
        .join("")
        .trim();
      const nested = Array.from(item.children)
        .filter((child) => child.tagName === "UL" || child.tagName === "OL")
        .map((child) => markdownFromBlock(child, depth + 1).trimEnd())
        .join("\n");
      const prefix = tag === "UL" ? "- " : `${index + 1}. `;
      const indent = "  ".repeat(depth);
      return `${indent}${prefix}${text}${nested ? `\n${nested}` : ""}`;
    }).join("\n")}\n\n`;
  }
  if (tag === "HR") return "---\n\n";
  if (tag === "TABLE") {
    const rows = Array.from(node.querySelectorAll("tr"), (row) =>
      Array.from(row.querySelectorAll("th, td"), (cell) =>
        markdownFromInline(cell).trim().replaceAll("|", "\\|"),
      ),
    );
    if (!rows.length) return "";
    const header = rows[0];
    const separator = header.map(() => "---");
    const formatRow = (cells: string[]) => `| ${cells.join(" | ")} |`;
    return `${formatRow(header)}\n${formatRow(separator)}${rows
      .slice(1)
      .map((row) => `\n${formatRow(row)}`)
      .join("")}\n\n`;
  }
  if (tag === "DIV" || tag === "SECTION" || tag === "ARTICLE") {
    return Array.from(node.childNodes, (child) =>
      markdownFromBlock(child, depth),
    ).join("");
  }
  return `${content()}\n\n`;
}

function markdownFromHtml(root: HTMLElement) {
  return Array.from(root.children, (child) => markdownFromBlock(child))
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderMarkdown(value: string) {
  return renderToStaticMarkup(
    <MarkdownContent renderMermaid={false} allowObjectUrls>
      {value}
    </MarkdownContent>,
  );
}

export interface MarkdownVisualEditorProps {
  value: string;
  onChange: (value: string) => void;
  tools: MarkdownToolbarTool[];
  className?: string;
  onImageSelected?: (file: File, objectUrl: string) => void;
}

export function MarkdownVisualEditor({
  value,
  onChange,
  tools,
  className = "",
  onImageSelected,
}: MarkdownVisualEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const imageObjectUrls = useRef<string[]>([]);
  const savedRangeRef = useRef<Range | null>(null);
  const lastEmittedValueRef = useRef<string | null>(null);
  const [html, setHtml] = useState(() => renderMarkdown(value));
  const [activeTools, setActiveTools] = useState<MarkdownToolbarTool[]>([]);

  useEffect(
    () => () => {
      for (const url of imageObjectUrls.current) URL.revokeObjectURL(url);
    },
    [],
  );

  useEffect(() => {
    if (lastEmittedValueRef.current === value) {
      lastEmittedValueRef.current = null;
      return;
    }
    setHtml(renderMarkdown(value));
  }, [value]);

  function commit() {
    const editor = editorRef.current;
    if (!editor) return;
    const markdown = markdownFromHtml(editor);
    lastEmittedValueRef.current = markdown;
    onChange(markdown);
    updateActiveTools();
  }

  function saveSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (
      !editor ||
      !selection?.rangeCount ||
      !editor.contains(selection.anchorNode)
    )
      return;
    savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    updateActiveTools();
  }

  function updateActiveTools() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    const node = selection?.anchorNode;
    const element = node instanceof HTMLElement ? node : node?.parentElement;
    if (!editor || !element || !editor.contains(element)) return;
    const active = new Set<MarkdownToolbarTool>();
    if (element.closest("strong, b")) active.add("bold");
    if (element.closest("em, i")) active.add("italic");
    if (element.closest("del, s")) active.add("strikethrough");
    if (element.closest("a")) active.add("link");
    if (element.closest("ul")) active.add("bullet-list");
    if (element.closest("ol")) active.add("ordered-list");
    if (element.closest("blockquote")) active.add("quote");
    if (element.closest("code")) active.add("code");
    const heading = element.closest("h1, h2, h3")?.tagName.toLowerCase();
    if (heading === "h1") active.add("h1");
    if (heading === "h2") active.add("h2");
    if (heading === "h3") active.add("h3");
    setActiveTools([...active]);
  }

  function restoreSelection() {
    const selection = window.getSelection();
    if (selection && savedRangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    }
  }

  function wrapSelection(tagName: string, className?: string) {
    const selection = window.getSelection();
    if (!selection || !editorRef.current) return;
    restoreSelection();
    const range = selection.getRangeAt(0);
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (range.collapsed) {
      const placeholder =
        tagName === "pre" ? "flowchart TD\n  A[Start] --> B[End]" : "text";
      element.textContent = placeholder;
      range.insertNode(element);
      range.selectNodeContents(element);
    } else {
      try {
        range.surroundContents(element);
      } catch {
        element.append(range.extractContents());
        range.insertNode(element);
      }
      range.selectNodeContents(element);
    }
    selection.removeAllRanges();
    selection.addRange(range);
    savedRangeRef.current = range.cloneRange();
    commit();
  }

  function handleAction(tool: MarkdownToolbarTool) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreSelection();
    const selection = window.getSelection();
    const anchor =
      selection?.anchorNode instanceof HTMLElement
        ? selection.anchorNode
        : selection?.anchorNode?.parentElement;
    const block = anchor?.closest("h1, h2, h3, p, blockquote");

    switch (tool) {
      case "bold":
        document.execCommand("bold");
        break;
      case "italic":
        document.execCommand("italic");
        break;
      case "strikethrough":
        document.execCommand("strikeThrough");
        break;
      case "h1":
      case "h2":
      case "h3": {
        const level = Number(tool[1]);
        if (block?.tagName.toLowerCase() === tool) {
          document.execCommand("formatBlock", false, "p");
        } else {
          document.execCommand("formatBlock", false, `h${level}`);
        }
        break;
      }
      case "link":
        if (anchor?.closest("a")) {
          document.execCommand("unlink");
        } else if (selection?.isCollapsed) {
          const range = selection.getRangeAt(0);
          const link = document.createElement("a");
          link.href = "https://example.com";
          link.textContent = "link text";
          range.insertNode(link);
          range.selectNodeContents(link);
          selection.removeAllRanges();
          selection.addRange(range);
          savedRangeRef.current = range.cloneRange();
          commit();
          return;
        } else {
          document.execCommand("createLink", false, "https://example.com");
        }
        break;
      case "image":
        imageInputRef.current?.click();
        return;
      case "bullet-list":
        document.execCommand("insertUnorderedList");
        break;
      case "ordered-list":
        document.execCommand("insertOrderedList");
        break;
      case "quote":
        document.execCommand(
          "formatBlock",
          false,
          block?.tagName === "BLOCKQUOTE" ? "p" : "blockquote",
        );
        break;
      case "mermaid": {
        const selection = window.getSelection();
        if (!selection || !editor) return;
        const range = selection.getRangeAt(0);
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        code.className = "language-mermaid";
        code.textContent = selection.isCollapsed
          ? "flowchart TD\n  A[Start] --> B[End]"
          : selection.toString();
        pre.append(code);
        range.deleteContents();
        range.insertNode(pre);
        range.selectNodeContents(code);
        selection.removeAllRanges();
        selection.addRange(range);
        savedRangeRef.current = range.cloneRange();
        commit();
        return;
      }
      case "code":
        wrapSelection("code");
        return;
    }
    saveSelection();
    commit();
  }

  function insertImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    const editor = editorRef.current;
    if (!file || !editor) return;
    const url = URL.createObjectURL(file);
    imageObjectUrls.current.push(url);
    onImageSelected?.(file, url);
    editor.focus();
    restoreSelection();
    const image = document.createElement("img");
    image.src = url;
    image.alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
    const selection = window.getSelection();
    if (selection?.rangeCount) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(image);
      range.setStartAfter(image);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editor.append(image);
    }
    saveSelection();
    commit();
  }

  return (
    <div
      className={`min-w-0 w-full max-w-full overflow-hidden rounded-md border bg-background ${className}`}
    >
      <MarkdownToolbar
        tools={tools}
        activeTools={activeTools}
        onAction={handleAction}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        aria-label="Choose article image"
        onChange={insertImage}
      />
      {/* biome-ignore lint/a11y/useSemanticElements: A contenteditable surface needs the textbox role. */}
      <div
        ref={editorRef}
        tabIndex={0}
        role="textbox"
        aria-multiline="true"
        aria-label="Formatted Markdown preview editor"
        contentEditable
        suppressContentEditableWarning
        className="min-h-95 max-h-150 overflow-auto p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Rendered by react-markdown with raw HTML disabled.
        dangerouslySetInnerHTML={{ __html: html }}
        onInput={commit}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onBlur={commit}
      />
    </div>
  );
}
