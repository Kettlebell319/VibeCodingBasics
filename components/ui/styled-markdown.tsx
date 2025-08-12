// components/ui/styled-markdown.tsx
'use client';

import { marked } from 'marked';
import { useEffect, useState } from 'react';

interface StyledMarkdownProps {
  content: string;
  className?: string;
}

export default function StyledMarkdown({ content, className = '' }: StyledMarkdownProps) {
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    // Configure marked for our old-school + modern hybrid style
    marked.setOptions({
      breaks: true,
      gfm: true,
    });

    // Custom renderer for old-school feel
    const renderer = new marked.Renderer();
    
    // Code blocks with terminal-style background
    renderer.code = (code, language) => {
      return `<div class="code-block">
        <div class="code-header">
          <span class="code-lang">${language || 'code'}</span>
          <div class="code-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
        <pre class="code-content"><code>${code}</code></pre>
      </div>`;
    };

    // Inline code with retro styling
    renderer.codespan = (code) => {
      return `<code class="inline-code">${code}</code>`;
    };

    // Headers with old-school underlines
    renderer.heading = (text, level) => {
      const underline = level === 1 ? '═'.repeat(text.length) : 
                       level === 2 ? '─'.repeat(text.length) : '';
      return `<h${level} class="heading-${level}">${text}${underline ? `<div class="heading-underline">${underline}</div>` : ''}</h${level}>`;
    };

    // Lists with custom bullets
    renderer.list = (body, ordered) => {
      const tag = ordered ? 'ol' : 'ul';
      return `<${tag} class="custom-list ${ordered ? 'ordered' : 'unordered'}">${body}</${tag}>`;
    };

    // Blockquotes with terminal-style borders
    renderer.blockquote = (quote) => {
      return `<blockquote class="terminal-quote">${quote}</blockquote>`;
    };

    marked.use({ renderer });
    
    const processed = marked(content);
    setHtmlContent(processed);
  }, [content]);

  return (
    <div 
      className={`styled-markdown ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{
        // CSS-in-JS for the old-school styling
        '--code-bg': '#1a1a1a',
        '--code-text': '#00ff41',
        '--accent-color': '#ff6b35',
        '--terminal-border': '#333',
      } as React.CSSProperties}
    />
  );
}