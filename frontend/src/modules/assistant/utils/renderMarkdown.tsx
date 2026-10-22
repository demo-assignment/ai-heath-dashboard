import { Fragment, ReactNode } from "react";

// Small Markdown renderer for chat answers: bold, italic, bullet and numbered lists, paragraphs.
// It builds React elements instead of HTML strings, so model output can never inject markup.
export const renderMarkdown = (source: string, isStreaming = false): ReactNode[] => {
  const text = isStreaming ? closeOpenBold(source) : source;
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(<p key={blocks.length}>{renderInline(paragraph.join(" "))}</p>);
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    const items = list.items.map((item, index) => <li key={index}>{renderInline(item)}</li>);
    blocks.push(
      list.ordered ? (
        <ol key={blocks.length} className="list-decimal space-y-1 pl-5">
          {items}
        </ol>
      ) : (
        <ul key={blocks.length} className="list-disc space-y-1 pl-5">
          {items}
        </ul>
      ),
    );
    list = null;
  };

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    const heading = /^#{1,6}\s+(.*)$/.exec(line);

    if (!line) {
      flushParagraph();
      flushList();
    } else if (bullet || numbered) {
      flushParagraph();
      const ordered = !!numbered;
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet || numbered)![1]);
    } else if (heading) {
      flushParagraph();
      flushList();
      blocks.push(
        <p key={blocks.length} className="font-semibold">
          {renderInline(heading[1])}
        </p>,
      );
    } else {
      flushList();
      paragraph.push(line);
    }
  }

  flushParagraph();
  flushList();
  return blocks;
};

const renderInline = (text: string): ReactNode => {
  return text.split(/(\*\*[^*]+\*\*|_[^_\s][^_]*_)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
};

// While streaming, "**bold" may not be closed yet. Close it for now so users don't see raw asterisks.
const closeOpenBold = (source: string) => {
  const lastLine = source.slice(source.lastIndexOf("\n") + 1);
  const markers = lastLine.match(/\*\*/g)?.length ?? 0;
  if (markers % 2 === 0) return source;
  return lastLine.endsWith("**") ? source.slice(0, -2) : `${source}**`;
};
