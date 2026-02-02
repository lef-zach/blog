import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
    "p", "br", "strong", "em", "u", "s", "a",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "pre", "code", "hr", "img"
];

const ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title', 'target', 'rel'],
    'hr': ['data-card'],
    'img': ['src', 'alt', 'title', 'width', 'height', 'data-size'],
    '*': ['class', 'title'] // Global attributes if needed 
};

const ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'];

export function sanitizeContent(html: string): string {
    if (!html) return "";

    return sanitizeHtml(html, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: ALLOWED_ATTRIBUTES,
        allowedSchemes: ALLOWED_SCHEMES,
        allowedSchemesByTag: {
            img: ['http', 'https', 'data']
        },
        disallowedTagsMode: 'discard',
        allowProtocolRelative: false, // Disallow //example.com (optional, but safer to force schemes)
        transformTags: {
            'a': sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow', target: '_blank' })
        }
    });
}
