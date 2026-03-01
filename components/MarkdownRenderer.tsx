import React from 'react';
import Markdown from 'react-markdown';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
    return (
        <div className={`markdown-body ${className || ''}`}>
            <Markdown>{content}</Markdown>
        </div>
    );
};
