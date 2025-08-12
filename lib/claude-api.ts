import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeResponse {
  content: string;
  seoTitle: string;
  seoDescription: string;
  category: string;
  tags: string[];
  responseTime: number;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateAnswer(
  title: string,
  content: string,
  userTier: 'free' | 'premium' = 'free'
): Promise<ClaudeResponse> {
  const startTime = Date.now();
  
  try {
    const prompt = `You are an expert developer helping with vibecoding questions. A user asked: "${title}"

${content !== title ? `Additional context: ${content}` : ''}

Please provide a comprehensive, helpful answer in CLEAN MARKDOWN format. Include:
1. A clear explanation of the solution
2. Code examples where relevant (use proper markdown code blocks)
3. Best practices and common pitfalls
4. Additional resources or next steps

Focus on practical, actionable advice for developers working with modern tools like Claude, Cursor, Bolt.new, Stripe, Replit, and other vibecoding technologies.

IMPORTANT: Return ONLY the markdown content, no JSON wrapper. Use proper markdown formatting:
- Use # for main headers
- Use ## for subheaders  
- Use \`\`\`language for code blocks
- Use \`code\` for inline code
- Use > for blockquotes
- Use - for bullet points

Also separately provide category and tags from these options:
Categories: general, claude, cursor, bolt.new, stripe, replit, nextjs, react, deployment, ai
Tags: vibe-coding, claude, api, ai, cursor, ai-coding, shortcuts, bolt.new, deployment, hosting, stripe, payments, integration, replit, development, environment, nextjs, react, typescript, javascript`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: userTier === 'premium' ? 4000 : 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const responseTime = Date.now() - startTime;
    
    // Get the clean markdown response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    
    // Clean any remaining object references and malformed content
    const cleanContent = responseText
      .replace(/\[object Object\]/g, '')
      .replace(/^\{.*?"content":\s*"/g, '')
      .replace(/",.*\}$/g, '')
      .replace(/\\n/g, '\n')
      .trim();

    // Determine category and tags based on content
    const lowerTitle = title.toLowerCase();
    const lowerContent = cleanContent.toLowerCase();
    
    let category = 'general';
    let tags = ['vibecoding'];
    
    if (lowerTitle.includes('stripe') || lowerContent.includes('stripe')) {
      category = 'stripe';
      tags = ['stripe', 'payments', 'integration'];
    } else if (lowerTitle.includes('bolt.new') || lowerContent.includes('bolt.new')) {
      category = 'bolt.new';
      tags = ['bolt.new', 'deployment'];
    } else if (lowerTitle.includes('claude') || lowerContent.includes('claude')) {
      category = 'claude';
      tags = ['claude', 'api', 'ai'];
    } else if (lowerTitle.includes('cursor') || lowerContent.includes('cursor')) {
      category = 'cursor';
      tags = ['cursor', 'ai-coding'];
    } else if (lowerTitle.includes('nextjs') || lowerContent.includes('next.js')) {
      category = 'nextjs';
      tags = ['nextjs', 'react'];
    }

    return {
      content: cleanContent,
      seoTitle: `${title} - Complete Guide | VibeCodingBasics.com`,
      seoDescription: `Learn ${title.toLowerCase()} with step-by-step instructions, code examples, and best practices for modern development.`,
      category,
      tags,
      responseTime
    };

  } catch (error) {
    console.error('Claude API error:', error);
    
    // Fallback to mock response if API fails
    const { generateAnswer: mockGenerateAnswer } = await import('./claude-mock');
    return mockGenerateAnswer(title, content, userTier);
  }
}