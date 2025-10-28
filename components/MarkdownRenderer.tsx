import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const sanitizeHtml = (html: string): string => {
    if (!html) return '';

    // Create a temporary DOM element to hold the user's content.
    // This leverages the browser's native, robust HTML parser.
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Find all elements within the temporary div
    const allElements = tempDiv.querySelectorAll('*');

    // Remove `style` attributes from all elements to prevent unwanted styling.
    allElements.forEach(el => {
      el.removeAttribute('style');
    });

    // Return the sanitized HTML as a string.
    return tempDiv.innerHTML;
  };

  const sanitizedHtml = sanitizeHtml(content);

  return (
    <div
      className={`break-words ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};