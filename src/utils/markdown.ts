/**
 * Lightweight markdown renderer for notes.
 * Supports: **bold**, *italic*, `code`, [links](url), - lists, line breaks.
 * HTML is escaped FIRST to prevent XSS.
 */
export function renderMarkdown(md: string): string {
  if (!md) return '';

  // 1. Escape HTML entities
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // 2. Code (inline) — before other inline formatting
  html = html.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-mono">$1</code>');

  // 3. Bold (**text**)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 4. Italic (*text*) — single asterisk, must not be part of **
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // 5. Links [text](url)
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary-600 underline hover:text-primary-800">$1</a>'
  );

  // 6. Lists: lines starting with - or *
  const lines = html.split('\n');
  const processed: string[] = [];
  let inList = false;

  for (const line of lines) {
    const listMatch = line.match(/^\s*[-*]\s+(.+)/);
    if (listMatch) {
      if (!inList) {
        processed.push('<ul class="list-disc list-inside space-y-0.5 ml-1">');
        inList = true;
      }
      processed.push(`<li>${listMatch[1]}</li>`);
    } else {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      processed.push(line);
    }
  }
  if (inList) processed.push('</ul>');

  // 7. Convert remaining newlines to <br>
  html = processed.join('\n').replace(/\n/g, '<br>');

  return html;
}
