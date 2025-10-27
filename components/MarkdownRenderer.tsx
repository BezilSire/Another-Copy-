import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const parseMarkdownToHtml = (text: string): string => {
    if (!text) return '';

    // 1. Basic HTML escaping
    let processedText = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // 2. Process blocks (paragraphs, headings) separated by double newlines
    const blocks = processedText.split(/(\r\n|\n){2,}/);
    
    const htmlBlocks = blocks.map(block => {
      block = block.trim();
      if (!block) return '';

      // Headings
      if (block.startsWith('# ')) {
        const headingText = block.substring(2);
        return `<h1 class="text-2xl font-bold my-4">${headingText}</h1>`;
      }
      if (block.startsWith('## ')) {
        const headingText = block.substring(3);
        return `<h2 class="text-xl font-bold my-3">${headingText}</h2>`;
      }

      // It's a paragraph. Process inline elements.
      let inlineProcessed = block;
      
      // Inline elements: Bold and Italic
      inlineProcessed = inlineProcessed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      inlineProcessed = inlineProcessed.replace(/__(.*?)__/g, '<strong>$1</strong>');
      inlineProcessed = inlineProcessed.replace(/\*(.*?)\*/g, '<em>$1</em>');
      inlineProcessed = inlineProcessed.replace(/_(.*?)_/g, '<em>$1</em>');
      
      // Linkify URLs
      const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
      inlineProcessed = inlineProcessed.replace(urlPattern, url => {
        const urlWithProto = url.startsWith('http') ? url : `https://${url}`;
        const escapedUrl = urlWithProto.replace(/"/g, '&quot;');
        return `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" class="text-green-400 hover:text-green-300 hover:underline">${url}</a>`;
      });
      
      // Convert single newlines within a block to <br>
      inlineProcessed = inlineProcessed.replace(/\n/g, '<br />');

      return `<p class="my-2">${inlineProcessed}</p>`;
    });

    return htmlBlocks.join('');
  };

  const html = parseMarkdownToHtml(content);

  return (
    <div
      className={`break-words ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};