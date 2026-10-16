import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Lightweight Markdown text renderer for clinical explanations:
 * - Unordered bullet lists: *, -, +
 * - Ordered lists / Lettered lists: 1., 2., A), B), A., B.
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Inline code: `text`
 * - Paragraphs and line breaks
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Split lines
  const lines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let currentListItems: { key: string; node: React.ReactNode }[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (currentListItems.length > 0 && listType) {
      if (listType === 'ul') {
        elements.push(
          <ul key={`list-${elements.length}`} className="my-2 space-y-1.5 list-disc list-outside pl-5">
            {currentListItems.map((item) => (
              <li key={item.key} className="leading-relaxed">
                {item.node}
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`list-${elements.length}`} className="my-2 space-y-1.5 list-outside pl-5">
            {currentListItems.map((item) => (
              <li key={item.key} className="leading-relaxed">
                {item.node}
              </li>
            ))}
          </ol>
        );
      }
      currentListItems = [];
      listType = null;
    }
  };

  const renderFormattedInline = (text: string): React.ReactNode[] => {
    // Regex matches:
    // 1: `code`
    // 2: **bold** or __bold__
    // 3: *italic* or _italic_
    const pattern = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;
    const parts = text.split(pattern);

    return parts.map((part, index) => {
      if (!part) return null;

      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 rounded text-[13px] font-mono bg-[#EDF0EE] dark:bg-slate-800 text-[#0B5F46] dark:text-emerald-300"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
        return (
          <strong key={index} className="font-semibold text-[#1E2B27] dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }

      if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
        return (
          <em key={index} className="italic">
            {part.slice(1, -1)}
          </em>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    // Check for bullet list: "* item", "- item", "+ item"
    const bulletMatch = trimmed.match(/^[*+-]\s+(.+)$/);
    // Check for lettered or numbered list: "1. item", "A) item", "A. item", "* **A)** item"
    const orderedMatch = trimmed.match(/^(\d+\.|[A-Za-z][.)])\s+(.+)$/);

    if (bulletMatch) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      currentListItems.push({
        key: `li-${lineIdx}`,
        node: renderFormattedInline(bulletMatch[1]),
      });
    } else if (orderedMatch) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      currentListItems.push({
        key: `oli-${lineIdx}`,
        node: (
          <div className="flex items-start gap-2">
            <span className="font-semibold text-[#1E2B27] dark:text-white shrink-0">{orderedMatch[1]}</span>
            <div>{renderFormattedInline(orderedMatch[2])}</div>
          </div>
        ),
      });
    } else {
      flushList();
      elements.push(
        <p key={`p-${lineIdx}`} className="leading-relaxed">
          {renderFormattedInline(trimmed)}
        </p>
      );
    }
  });

  flushList();

  return <div className={`space-y-2.5 ${className}`}>{elements}</div>;
};

