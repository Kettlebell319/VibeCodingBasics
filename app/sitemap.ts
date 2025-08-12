import { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vibecodingbasics.com';
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/subscription`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ];

  // Dynamic question/blog pages
  const { data: questions } = await supabaseAdmin
    .from('questions')
    .select('slug, created_at, updated_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  const questionPages: MetadataRoute.Sitemap = questions?.map((question) => ({
    url: `${baseUrl}/question/${question.slug}`,
    lastModified: new Date(question.updated_at || question.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  })) || [];

  return [...staticPages, ...questionPages];
}