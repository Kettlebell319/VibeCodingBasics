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
    const prompt = `You are a brilliant senior developer and coding mentor with deep expertise in modern development. A user asked: "${title}"

${content !== title ? `Additional context: ${content}` : ''}

Provide an insightful, clever, and genuinely valuable response using this VibeCoding blog format:

# ${title}

> Asked by @vibedev

## 🧠 TL;DR
Write a concise, smart summary that actually answers their question (2-3 sentences max).

## 🚀 The Why  
Explain why this matters to their development journey. Be insightful about the bigger picture.

## 🔧 The How
Provide specific, actionable steps. If it's about books, recommend specific titles with reasons. If it's about code, show clean examples. Break into logical sections with ### subheaders.

## 📝 Real Talk
Share an honest insight, personal experience, or common pitfall. Make it feel like advice from a trusted mentor.

## 🔗 Bonus Resources
- Provide 2-3 specific resource names (books, documentation, tools) that users can search for
- Include brief descriptions of why they're valuable
- DO NOT include any URLs or web links - just searchable names

## 🧵 Quote This
End with a memorable, quotable insight about the topic.

CRITICAL REQUIREMENTS:
- Be specific and avoid generic advice
- If they ask about books, recommend actual titles with reasons
- If they ask about code, provide working examples  
- Write conversationally but expertly
- Focus on practical value they can use immediately
- Make it feel personal and insightful, not robotic
- Use proper markdown formatting throughout
- NEVER include URLs, web links, or fake links - only provide searchable resource names
- Users will search for resources themselves, so just give them the right names to search for

Return ONLY the markdown content, no JSON wrapper.`;

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