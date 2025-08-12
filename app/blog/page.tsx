import { Suspense } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Clock, Tag } from 'lucide-react';
import Link from 'next/link';
import StructuredData from '@/components/structured-data';

interface BlogPost {
  slug: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  view_count: number;
  created_at: string;
  seo_description: string;
}

async function getBlogPosts(): Promise<BlogPost[]> {
  
  const { data: questions, error } = await supabaseAdmin
    .from('questions')
    .select(`
      slug,
      title,
      content,
      category,
      tags,
      view_count,
      created_at,
      answers!inner(seo_description)
    `)
    .eq('status', 'published')
    .order('view_count', { ascending: false })
    .limit(20);
  
  if (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }
  
  return questions.map(q => ({
    slug: q.slug,
    title: q.title,
    content: q.content,
    category: q.category,
    tags: q.tags || [],
    view_count: q.view_count,
    created_at: q.created_at,
    seo_description: q.answers?.[0]?.seo_description || `Get answers to: ${q.title}`
  }));
}

export const metadata = {
  title: 'VibeCoding Blog - AI-Powered Coding Solutions',
  description: 'Discover expert coding solutions, tutorials, and insights powered by AI. From Stripe integration to Claude API, get answers to your programming questions.',
  openGraph: {
    title: 'VibeCoding Blog - AI-Powered Coding Solutions',
    description: 'Expert coding solutions and tutorials powered by AI',
    type: 'website',
  },
  alternates: {
    canonical: '/blog'
  }
};

function BlogPostCard({ post }: { post: BlogPost }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  return (
    <Link href={`/question/${post.slug}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <Badge variant="secondary" className="text-xs">
              {post.category}
            </Badge>
            <div className="flex items-center text-sm text-gray-500">
              <Eye className="h-4 w-4 mr-1" />
              {post.view_count}
            </div>
          </div>
          
          <CardTitle className="text-lg line-clamp-2 hover:text-blue-600 transition-colors">
            {post.title}
          </CardTitle>
          
          <CardDescription className="text-sm text-gray-600">
            {post.seo_description}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            <p className="text-gray-700 text-sm line-clamp-3">
              {truncateContent(post.content)}
            </p>
            
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {post.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {post.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{post.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
            
            <div className="flex items-center text-xs text-gray-500 pt-2 border-t">
              <Clock className="h-3 w-3 mr-1" />
              {formatDate(post.created_at)}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function BlogPage() {
  const posts = await getBlogPosts();
  
  // Create structured data directly here (server-side)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vibecodingbasics.com';
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'VibeCoding Blog',
    description: 'AI-powered coding solutions, tutorials, and expert insights',
    url: `${baseUrl}/blog`,
    publisher: {
      '@type': 'Organization',
      name: 'VibeCoding',
      url: baseUrl,
    },
  };
  
  return (
    <>
      <StructuredData data={structuredData} />
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              VibeCoding Blog
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              AI-powered coding solutions, tutorials, and expert insights to accelerate your development journey
            </p>
          </div>
        </div>
      </div>

      {/* Blog Posts Grid */}
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">
              No blog posts yet
            </h3>
            <p className="text-gray-600 mb-8">
              Check back soon for expert coding insights and tutorials!
            </p>
            <Link 
              href="/"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ask a Question
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Latest Articles
              </h2>
              <p className="text-gray-600">
                {posts.length} expert-answered coding questions
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <BlogPostCard key={post.slug} post={post} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}