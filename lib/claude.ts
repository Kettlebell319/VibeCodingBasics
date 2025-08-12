import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface ClaudeResponse {
  content: string;
  seoTitle: string;
  seoDescription: string;
  category: string;
  tags: string[];
  responseTime: number;
}

export async function generateAnswer(
  title: string,
  content: string,
  userTier: 'free' | 'premium' = 'free'
): Promise<ClaudeResponse> {
  const startTime = Date.now();
  
  const prompt = `
You are an expert vibecoding assistant. A user has asked this question and needs practical, actionable advice.

Question Title: ${title}
Question Details: ${content}

Please provide a comprehensive answer formatted as a blog post with:

1. **Clear step-by-step instructions**
2. **Code examples where relevant** (use proper syntax highlighting)
3. **Common pitfalls to avoid**
4. **Links to official documentation when helpful**
5. **Practical tips for vibecoding specifically**

Also provide the following metadata (format exactly as shown):

SEO_TITLE: [Create an engaging title under 60 characters]
SEO_DESCRIPTION: [Write a compelling description under 160 characters]
CATEGORY: [Choose ONE: bolt.new, cursor, claude, replit, stripe, general]
TAGS: [Provide 3-5 relevant tags separated by commas]

Make your answer practical, actionable, and specifically helpful for someone building with AI tools like Claude, Cursor, Bolt.new, and Replit.
  `;

  try {
    const response = await anthropic.messages.create({
      model: userTier === 'premium' ? 'claude-3-5-sonnet-20241022' : 'claude-3-haiku-20240307',
      max_tokens: userTier === 'premium' ? 4000 : 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    const responseTime = Date.now() - startTime;

    // Parse the structured response
    const parsed = parseClaudeResponse(responseText);
    
    return {
      ...parsed,
      responseTime
    };
  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error('Failed to generate answer');
  }
}

function parseClaudeResponse(text: string): Omit<ClaudeResponse, 'responseTime'> {
  // Extract metadata from the response
  const seoTitleMatch = text.match(/SEO_TITLE:\s*(.+)/);
  const seoDescMatch = text.match(/SEO_DESCRIPTION:\s*(.+)/);
  const categoryMatch = text.match(/CATEGORY:\s*(.+)/);
  const tagsMatch = text.match(/TAGS:\s*(.+)/);

  // Remove metadata from content
  const content = text
    .replace(/SEO_TITLE:\s*.+/g, '')
    .replace(/SEO_DESCRIPTION:\s*.+/g, '')
    .replace(/CATEGORY:\s*.+/g, '')
    .replace(/TAGS:\s*.+/g, '')
    .trim();

  return {
    content: content || text,
    seoTitle: seoTitleMatch?.[1]?.trim() || 'VibeCode Answer',
    seoDescription: seoDescMatch?.[1]?.trim() || 'Get practical answers to your vibecoding questions.',
    category: categoryMatch?.[1]?.trim() || 'general',
    tags: tagsMatch?.[1]?.split(',').map(tag => tag.trim()) || ['vibecoding']
  };
}

export default anthropic;