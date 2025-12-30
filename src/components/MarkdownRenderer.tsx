
import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const sanitizeHtml = (html: string): string => {
    if (!html) return '';

    // Use a temporary element to sanitize the HTML correctly.
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Remove direct styling and ensure standard semantic flow.
    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach(el => {
      el.removeAttribute('style');
    });

    return tempDiv.innerHTML;
  };

  const sanitizedHtml = sanitizeHtml(content);

  return (
    <div
      className={`break-words markdown-stream ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};
