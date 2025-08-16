import { notFound } from 'next/navigation';
import { ArrowLeft, Eye, Tag, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import db from '@/lib/db';
import StructuredData from '@/components/structured-data';
import ShareButtons from '@/components/share-buttons';
// import CommentSection from '@/components/comments/comment-section'; // Temporarily disabled

function processMarkdownToHtml(markdown: string): string {
  return markdown
    // Headers (clean, no underlines)
    .replace(/^# (.+)$/gm, '<h1 class="vibe-h1">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 class="vibe-h2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="vibe-h3">$1</h3>')
    
    // Code blocks with clean styling
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => `
      <div class="vibe-code-block">
        <div class="vibe-code-header">
          <span class="vibe-code-lang">${lang || 'code'}</span>
          <div class="vibe-code-dots">
            <span class="vibe-dot-red"></span>
            <span class="vibe-dot-yellow"></span>
            <span class="vibe-dot-green"></span>
          </div>
        </div>
        <pre class="vibe-code-content"><code>${code.trim()}</code></pre>
      </div>
    `)
    
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="vibe-inline-code">$1</code>')
    
    // Blockquotes (for the "Asked by" section)
    .replace(/^> (.+)$/gm, '<blockquote class="vibe-quote">$1</blockquote>')
    
    // Bold text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="vibe-bold">$1</strong>')
    
    // Bullet points
    .replace(/^- (.+)$/gm, '<div class="vibe-bullet">$1</div>')
    
    // Convert newlines to paragraphs
    .split('\n\n')
    .map(paragraph => {
      if (paragraph.trim() === '') return '';
      if (paragraph.includes('<h') || paragraph.includes('<div') || paragraph.includes('<blockquote')) {
        return paragraph;
      }
      return `<p class="vibe-paragraph">${paragraph}</p>`;
    })
    .join('\n');
}

interface Question {
  id: string;
  title: string;
  content: string;
  slug: string;
  category: string;
  tags: string[];
  view_count: number;
  created_at: string;
}

interface Answer {
  id: string;
  content: string;
  seo_title: string;
  seo_description: string;
  created_at: string;
}

async function getQuestion(slug: string): Promise<{ question: Question; answer: Answer } | null> {
  try {
    const result = await db.query(`
      SELECT 
        q.*,
        a.id as answer_id,
        a.content as answer_content,
        a.seo_title,
        a.seo_description,
        a.created_at as answer_created_at
      FROM questions q
      LEFT JOIN answers a ON q.id = a.question_id
      WHERE q.slug = $1 AND q.status = 'published'
    `, [slug]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    
    // Increment view count
    await db.query(`
      UPDATE questions 
      SET view_count = view_count + 1 
      WHERE slug = $1
    `, [slug]);

    return {
      question: {
        id: row.id,
        title: row.title,
        content: row.content,
        slug: row.slug,
        category: row.category,
        tags: row.tags || [],
        view_count: row.view_count + 1,
        created_at: row.created_at
      },
      answer: {
        id: row.answer_id,
        content: row.answer_content,
        seo_title: row.seo_title,
        seo_description: row.seo_description,
        created_at: row.answer_created_at
      }
    };
  } catch (error) {
    console.error('Error fetching question:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getQuestion(slug);
  
  if (!data) {
    return {
      title: 'Question Not Found - VibeCode.dev',
      description: 'The question you are looking for could not be found.'
    };
  }

  return {
    title: data.answer.seo_title || data.question.title,
    description: data.answer.seo_description || `Get answers to: ${data.question.title}`,
    keywords: data.question.tags?.join(', '),
    authors: [{ name: 'VibeCoding AI' }],
    openGraph: {
      title: data.answer.seo_title || data.question.title,
      description: data.answer.seo_description,
      type: 'article',
      publishedTime: data.question.created_at,
      tags: data.question.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: data.answer.seo_title || data.question.title,
      description: data.answer.seo_description,
    },
    alternates: {
      canonical: `/question/${data.question.slug}`
    }
  };
}

export default async function QuestionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getQuestion(slug);

  if (!data) {
    notFound();
  }

  const { question, answer } = data;

  // Structured data for SEO (server-side)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vibecodingbasics.com';
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: question.title,
    description: answer.seo_description || `Get answers to: ${question.title}`,
    url: `${baseUrl}/question/${question.slug}`,
    datePublished: question.created_at,
    dateModified: question.created_at,
    author: {
      '@type': 'Organization',
      name: 'VibeCoding',
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'VibeCoding',
      url: baseUrl,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/question/${question.slug}`,
    },
    articleSection: question.category,
    keywords: (question.tags || []).join(', '),
  };

  return (
    <>
      <StructuredData data={structuredData} />
      <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-gray-900">VibeCoding</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-4">
              <Link href="/" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                Home
              </Link>
              <Link href="/blog" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                Blog
              </Link>
              <Link href="/subscription" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                Pricing
              </Link>
            </nav>
          </div>
          <Link href="/blog">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Question */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {question.title}
          </h1>
          
          {question.content !== question.title && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-700 mb-2">Question Details:</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{question.content}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
            <div className="flex items-center">
              <Eye className="h-4 w-4 mr-1" />
              {question.view_count} views
            </div>
            <div className="flex items-center">
              <Tag className="h-4 w-4 mr-1" />
              {question.category}
            </div>
          </div>

          {question.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {question.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Answer */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Answer</h2>
          <Card>
            <CardContent className="p-6">
              <div className="vibe-markdown">
                <div dangerouslySetInnerHTML={{ 
                  __html: processMarkdownToHtml(answer.content) 
                }} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Social Sharing & Follow-up */}
        <div className="space-y-6">
          {/* Social Sharing */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 flex items-center">
                <Share2 className="h-5 w-5 mr-2" />
                Share this solution
              </h3>
              <ShareButtons title={question.title} />
            </CardContent>
          </Card>

          {/* Follow-up Question */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Have a follow-up question?</h3>
              <Link href="/">
                <Button className="w-full">
                  Ask Another Question
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Comments Section - Temporarily disabled for launch simplicity */}
        {/* <CommentSection 
          questionId={question.id}
          questionTitle={question.title}
        /> */}
      </div>
    </div>
    </>
  );
}