import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicProfileClient } from './PublicProfileClient';
import type { Card } from '@/types/card';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

// Helper para construir URL completa de imagens da API (server-side version)
function getFullImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/uploads/')) {
    return `${API_URL}${url}`;
  }
  return url;
}

async function getPublicProfile(slug: string) {
  try {
    const res = await fetch(`${API_URL}/${slug}`, {
      next: { revalidate: 60 } // ISR: revalidate every 60s
    });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch (error) {
    return null;
  }
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicProfile(slug);

  if (!data) {
    return {
      title: 'Perfil não encontrado'
    };
  }

  const { pageSettings } = data;
  const imageUrl = getFullImageUrl(pageSettings.headerImageUrl);

  return {
    title: `${pageSettings.displayName} - Divulga Fácil`,
    description: pageSettings.bio || `Confira os produtos de ${pageSettings.displayName}`,
    openGraph: {
      title: pageSettings.displayName,
      description: pageSettings.bio || `Confira os produtos de ${pageSettings.displayName}`,
      images: imageUrl ? [imageUrl] : [],
      url: `${process.env.NEXT_PUBLIC_WEB_URL}/${slug}`
    },
    twitter: {
      card: 'summary_large_image',
      title: pageSettings.displayName,
      description: pageSettings.bio || `Confira os produtos de ${pageSettings.displayName}`,
      images: imageUrl ? [imageUrl] : []
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_WEB_URL}/${slug}`
    }
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getPublicProfile(slug);

  if (!data) {
    notFound();
  }

  const { pageSettings, cards } = data;

  // Transform URLs on the server to avoid hydration mismatch
  const transformedPageSettings = {
    ...pageSettings,
    headerImageUrl: getFullImageUrl(pageSettings.headerImageUrl) || null,
    logoUrl: getFullImageUrl(pageSettings.logoUrl) || null
  };

  // Transform card data: fix image URLs and rename card_slug to slug for frontend compatibility
  const transformedCards = cards.items.map((card: any) => ({
    ...card,
    slug: card.card_slug || card.slug, // Map card_slug to slug for frontend components
    image_url: getFullImageUrl(card.image_url)
  }));

  // Extract unique marketplaces and categories from cards
  const marketplaces = [...new Set(transformedCards.map((card: Card) => card.marketplace))].filter(Boolean) as string[];
  const categories = [...new Set(transformedCards.map((card: Card) => card.category))].filter(Boolean) as string[];

  return (
    <PublicProfileClient
      slug={slug}
      pageSettings={transformedPageSettings}
      initialCards={transformedCards}
      hasMore={cards.hasMore}
      marketplaces={marketplaces}
      categories={categories}
    />
  );
}
