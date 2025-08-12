import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vibecodingbasics.com';
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/auth/',
        '/my-questions',
        '/subscription/success',
        '/subscription/cancel',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}