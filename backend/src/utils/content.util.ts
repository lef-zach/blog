export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function generateExcerpt(content: string, maxLength: number = 200): string {
  const plainText = content.replace(/<[^>]*>/g, '');
  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength).trim() + '...';
}

export function calculateReadingTime(content: string): number {
  const plainText = content.replace(/<[^>]*>/g, '');
  const wordsPerMinute = 200;
  const wordCount = plainText.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

export function calculateWordCount(content: string): number {
  const plainText = content.replace(/<[^>]*>/g, '');
  return plainText.split(/\s+/).length;
}
