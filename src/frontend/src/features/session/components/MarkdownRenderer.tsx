import React from 'react';

// Lightweight, zero-dependency Markdown renderer for USMLE AI explanations
// Formats bold, bullet points, headers, paragraphs, and inline lists cleanly
export const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  // Split lines into blocks
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let currentList: string[] = [];
  let blockKey = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${blockKey++}`} className="space-y-1.5 my-2 pl-4 list-disc marker:text-emerald-500">
          {currentList.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  const renderInline = (text: string) => {
    // Replace **bold** with <strong>
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-slate-900 dark:text-slate-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      flushList();
      continue;
    }

    // Bullet points: starts with - or *
    if (line.startsWith('- ') || line.startsWith('* ')) {
      currentList.push(line.slice(2));
      continue;
    }

    flushList();

    // Headers: **Header Title** alone on a line, or ### Header
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h-${blockKey++}`} className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-3 mb-1">
          {renderInline(line.slice(4))}
        </h4>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h-${blockKey++}`} className="text-base font-bold text-slate-900 dark:text-slate-100 mt-3.5 mb-1.5">
          {renderInline(line.slice(3))}
        </h3>
      );
    } else if (line.startsWith('**') && line.endsWith('**') && !line.slice(2, -2).includes('**')) {
      // Bold title line like **Core Clinical Concept & Pathophysiology**
      elements.push(
        <h4 key={`bh-${blockKey++}`} className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-3.5 first:mt-0 mb-1">
          {line.slice(2, -2)}
        </h4>
      );
    } else {
      elements.push(
        <p key={`p-${blockKey++}`} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 my-1">
          {renderInline(line)}
        </p>
      );
    }
  }

  flushList();

  return <div className="space-y-1">{elements}</div>;
};
