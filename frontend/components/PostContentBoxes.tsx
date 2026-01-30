"use client";

import React, { useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";

type Props = { html: string };

const ALLOWED_TAGS = [
    "p", "br", "strong", "em", "u", "s", "a",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "pre", "code", "hr"
];

// keep attrs tight. Avoid style.
const ALLOWED_ATTR = ["href", "title", "target", "rel", "data-card"];

function isSafeHref(href: string) {
    // allow only http/https/mailto/tel
    return /^(https?:|mailto:|tel:)/i.test(href);
}

export default function PostContentBoxes({ html }: Props) {
    const [blocks, setBlocks] = React.useState<string[]>([html]);

    React.useEffect(() => {
        if (!html) {
            setBlocks([]);
            return;
        }

        try {
            // 1) sanitize the HTML
            const clean = DOMPurify.sanitize(html, {
                ALLOWED_TAGS,
                ALLOWED_ATTR,
                KEEP_CONTENT: true
            });

            // 2) parse and split into top-level blocks
            const doc = new DOMParser().parseFromString(clean, "text/html");
            const nodes = Array.from(doc.body.childNodes);

            const outBlocks: string[] = [];
            let currentBlockBuffer: string[] = [];

            const flushBuffer = () => {
                if (currentBlockBuffer.length > 0) {
                    outBlocks.push(currentBlockBuffer.join(""));
                    currentBlockBuffer = [];
                }
            };

            for (const node of nodes) {
                // Check if node is HR or CONTAINS HR (robust check)
                const isSeparator =
                    (node.nodeType === 1 /* Node.ELEMENT_NODE */ && (node as HTMLElement).tagName === "HR") ||
                    (node.nodeType === 1 /* Node.ELEMENT_NODE */ && (node as HTMLElement).querySelector('hr') !== null);

                if (isSeparator) {
                    // Separator encountered: finish current box, start new one.
                    // Do not include the separator node itself.
                    flushBuffer();
                    continue;
                }

                // Handle raw Text Nodes (often whitespace between Quill blocks)
                if (node.nodeType === 3 /* Node.TEXT_NODE */) {
                    if (!node.textContent || !node.textContent.trim()) {
                        continue; // Skip pure whitespace
                    }
                    // Wrap loose text in <p>
                    currentBlockBuffer.push(`<p>${escapeHtml(node.textContent || "")}</p>`);
                    continue;
                }

                if (node.nodeType !== 1 /* Node.ELEMENT_NODE */) continue;

                const el = node as HTMLElement;

                // Handle link sanitization
                if (el.tagName === "A") {
                    const href = el.getAttribute("href") || "";
                    if (!href || !isSafeHref(href)) {
                        el.removeAttribute("href");
                    } else {
                        el.setAttribute("target", "_blank");
                        el.setAttribute("rel", "noopener noreferrer nofollow");
                    }
                }

                el.querySelectorAll?.("a").forEach((a) => {
                    const href = a.getAttribute("href") || "";
                    if (!href || !isSafeHref(href)) {
                        a.removeAttribute("href");
                    } else {
                        a.setAttribute("target", "_blank");
                        a.setAttribute("rel", "noopener noreferrer nofollow");
                    }
                });

                // Add the element HTML to the buffer
                currentBlockBuffer.push(el.outerHTML);
            }

            // Flush any remaining content
            flushBuffer();

            setBlocks(outBlocks);
        } catch (e) {
            console.error("Error parsing content boxes:", e);
            // Fallback to safe raw html if parsing fails
            setBlocks([DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR })]);
        }
    }, [html]);

    return (
        <div className="postContentBoxes space-y-4">
            {blocks.map((blockHtml, i) => (
                <section
                    key={i}
                    className="contentBox"
                    dangerouslySetInnerHTML={{ __html: blockHtml }}
                />
            ))}
        </div>
    );
}

function escapeHtml(s: string) {
    return s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
