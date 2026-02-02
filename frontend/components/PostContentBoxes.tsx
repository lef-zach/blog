"use client";

import React, { useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";

type Props = { html: string };

const ALLOWED_TAGS = [
    "p", "br", "strong", "em", "u", "s", "a",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "pre", "code", "hr", "img"
];

// keep attrs tight. Avoid style.
const ALLOWED_ATTR = ["href", "title", "target", "rel", "data-card", "src", "alt", "width", "height", "data-size"];

function isSafeHref(href: string) {
    // allow only http/https/mailto/tel
    return /^(https?:|mailto:|tel:)/i.test(href);
}

function isSafeImageSrc(src: string) {
    return /^(https?:)/i.test(src) || /^data:image\//i.test(src);
}

function normalizeImageSize(value: string | null) {
    const size = (value || '').toUpperCase();
    if (size === 'S' || size === 'M' || size === 'B') return size;
    return 'M';
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

                if (el.tagName === "IMG") {
                    const src = el.getAttribute("src") || "";
                    if (!src || !isSafeImageSrc(src)) {
                        el.removeAttribute("src");
                    } else {
                        const size = normalizeImageSize(el.getAttribute("data-size"));
                        el.setAttribute("data-size", size);
                        el.classList.add("content-image", `content-image--${size.toLowerCase()}`);
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

                el.querySelectorAll?.("img").forEach((img) => {
                    const src = img.getAttribute("src") || "";
                    if (!src || !isSafeImageSrc(src)) {
                        img.removeAttribute("src");
                        return;
                    }
                    const size = normalizeImageSize(img.getAttribute("data-size"));
                    img.setAttribute("data-size", size);
                    img.classList.add("content-image", `content-image--${size.toLowerCase()}`);
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
