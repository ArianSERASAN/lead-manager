import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../../utils/markdown';

describe('renderMarkdown', () => {
  it('returns empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });

  it('renders bold text', () => {
    expect(renderMarkdown('**hello**')).toContain('<strong>hello</strong>');
  });

  it('renders italic text', () => {
    expect(renderMarkdown('*hello*')).toContain('<em>hello</em>');
  });

  it('renders inline code', () => {
    const result = renderMarkdown('`code`');
    expect(result).toContain('<code');
    expect(result).toContain('code</code>');
  });

  it('renders links', () => {
    const result = renderMarkdown('[Google](https://google.com)');
    expect(result).toContain('href="https://google.com"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain('>Google</a>');
  });

  it('renders unordered lists', () => {
    const result = renderMarkdown('- item 1\n- item 2');
    expect(result).toContain('<ul');
    expect(result).toContain('<li>item 1</li>');
    expect(result).toContain('<li>item 2</li>');
    expect(result).toContain('</ul>');
  });

  it('converts newlines to <br>', () => {
    const result = renderMarkdown('line 1\nline 2');
    expect(result).toContain('line 1<br>line 2');
  });

  // XSS prevention
  it('escapes HTML tags (XSS prevention)', () => {
    const result = renderMarkdown('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('escapes HTML in bold text', () => {
    const result = renderMarkdown('**<img src=x onerror=alert(1)>**');
    expect(result).not.toContain('<img');
    expect(result).toContain('&lt;img');
  });

  it('handles combined formatting', () => {
    const result = renderMarkdown('**bold** and *italic* and `code`');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('code</code>');
  });

  it('handles plain text without formatting', () => {
    const result = renderMarkdown('just plain text');
    expect(result).toBe('just plain text');
  });
});
