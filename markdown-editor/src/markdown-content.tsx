import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidDiagram } from "./mermaid-diagram.js";

const markdownStyles =
  "text-sm leading-7 text-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-3 [&_blockquote]:border-[#d1d9e0] [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-[#eff2f5] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[.9em] [&_del]:line-through [&_em]:italic [&_strong]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:mb-2 [&_h4]:mt-4 [&_h4]:font-semibold [&_hr]:my-6 [&_hr]:border-[#d1d9e0] [&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-[#eff2f5] [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[#d1d9e0] [&_td]:px-2.5 [&_td]:py-1.5 [&_th]:border [&_th]:border-[#d1d9e0] [&_th]:bg-[#f6f8fa] [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6";

export function MarkdownContent({
  children,
  className = "",
  allowObjectUrls = false,
}: {
  children: string;
  className?: string;
  allowObjectUrls?: boolean;
}) {
  return (
    <div className={`${markdownStyles} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) =>
          allowObjectUrls && url.startsWith("blob:") ? url : defaultUrlTransform(url)
        }
        components={{
          em: ({ children }) => <em className="italic">{children}</em>,
          pre: ({ children, ...props }) => {
            const child = Children.toArray(children)[0];
            if (isValidElement<{ className?: string; children?: ReactNode }>(child)) {
              const code = child as ReactElement<{ className?: string; children?: ReactNode }>;
              if (code.props.className?.split(" ").includes("language-mermaid")) {
                return <MermaidDiagram source={String(code.props.children ?? "").trimEnd()} />;
              }
            }
            return <pre className={props.className}>{children}</pre>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
