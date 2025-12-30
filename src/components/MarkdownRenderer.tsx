
import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const sanitizeHtml = (html: string): string => {
    if (!html) return '';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach(el => {
      el.removeAttribute('style');
    });

    return tempDiv.innerHTML;
  };

  const sanitizedHtml = sanitizeHtml(content);

  return (
    <div
      className={`break-words markdown-stream leading-relaxed ${className || ''}`}
      style={{ display: 'inline' }}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};
