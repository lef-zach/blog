"use client";

import React, { useMemo } from 'react';

interface ArticleRendererProps {
    content: string;
}

export function ArticleRenderer({ content }: ArticleRendererProps) {
    const parts = useMemo(() => {
        if (typeof window === 'undefined') {
            return [{ type: 'html', content }];
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');

        const result: { type: 'card' | 'html', content: string }[] = [];
        let currentHtmlBuffer: Node[] = [];

        const flushBuffer = () => {
            if (currentHtmlBuffer.length > 0) {
                const container = document.createElement('div');
                currentHtmlBuffer.forEach(node => container.appendChild(node.cloneNode(true)));
                if (container.innerHTML.trim()) {
                    result.push({ type: 'html', content: container.innerHTML });
                }
                currentHtmlBuffer = [];
            }
        };

        const isDivider = (node: Node): boolean => {
            if (node instanceof Element) {
                // Check if the node itself is an HR
                if (node.tagName.toLowerCase() === 'hr') return true;
                // Check if it contains an HR (e.g. <p><hr></p>)
                if (node.querySelector('hr')) return true;
                // Check for Quill's various ways of representing empty lines that might interpreted as dividers by user? 
                // No, sticking to strict HR for now to be precise.
            }
            return false;
        };

        const traverse = (node: Node) => {
            if (isDivider(node)) {
                // Divider found. Flush buffer (creating a box for content above).
                flushBuffer();
                // We discard the Divider node (and its container if it was just a wrapper for the divider)
                // effectively "consuming" the separator.
            } else {
                // Everything else (text, cards, divs, etc.) goes into the current box.
                // This allows grouping multiple elements (Title + Paragraph) into one Box.
                currentHtmlBuffer.push(node);
            }
        };

        // Start traversal from body children
        doc.body.childNodes.forEach(node => traverse(node));
        flushBuffer();

        return result;

    }, [content]);

    // Fallback for SSR or if content is empty
    if (!parts || parts.length === 0) return null;

    return (
        <div className="space-y-8">
            {parts.map((part, index) => (
                <div key={index} className="border border-border/50 rounded-lg p-8 shadow-sm bg-card text-card-foreground">
                    <div
                        className="prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: part.content }}
                    />
                </div>
            ))}
        </div>
    );
}
