'use client';

interface StructuredDataProps {
  data: Record<string, unknown>;
}

export default function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data, null, 2),
      }}
    />
  );
}

// Helper functions for creating structured data
export function createBlogPostStructuredData(post: {
  title: string;
  description: string;
  slug: string;
  datePublished: string;
  category: string;
  tags: string[];
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vibecodingbasics.com';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    url: `${baseUrl}/question/${post.slug}`,
    datePublished: post.datePublished,
    dateModified: post.datePublished,
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
      '@id': `${baseUrl}/question/${post.slug}`,
    },
    articleSection: post.category,
    keywords: post.tags.join(', '),
  };
}

export function createBlogListStructuredData() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vibecodingbasics.com';
  
  return {
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
}