import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PublicCardDetail } from '@/components/pinterest/PublicCardDetail';
import { PublicFooter } from '@/components/pinterest/PublicFooter';

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

async function getPublicCard(slug: string, cardSlug: string) {
  try {
    const res = await fetch(`${API_URL}/${slug}/${cardSlug}`, {
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
  params: Promise<{ slug: string; cardSlug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, cardSlug } = await params;
  const data = await getPublicCard(slug, cardSlug);

  if (!data) {
    return {
      title: 'Produto não encontrado'
    };
  }

  const { card, pageSettings } = data;

  const imageUrl = getFullImageUrl(card.image_url);

  return {
    title: `${card.title} - ${pageSettings.displayName}`,
    description: card.description || `${card.title} - ${card.price}`,
    openGraph: {
      title: card.title,
      description: card.description || `${card.title} - ${card.price}`,
      images: imageUrl ? [imageUrl] : [],
      url: `${process.env.NEXT_PUBLIC_WEB_URL}/${slug}/${cardSlug}`
    },
    twitter: {
      card: 'summary_large_image',
      title: card.title,
      description: card.description || `${card.title} - ${card.price}`,
      images: imageUrl ? [imageUrl] : []
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_WEB_URL}/${slug}/${cardSlug}`
    }
  };
}

export default async function PublicCardDetailPage({ params }: PageProps) {
  const { slug, cardSlug } = await params;
  const data = await getPublicCard(slug, cardSlug);

  if (!data) {
    notFound();
  }

  const { card, pageSettings } = data;

  // Transform card data: fix image URL and rename card_slug to slug for frontend compatibility
  const transformedCard = {
    ...card,
    slug: card.card_slug || card.slug, // Map card_slug to slug for frontend components
    image_url: getFullImageUrl(card.image_url)
  };

  // Determine card class based on source
  const cardSourceClass = card.source === 'BOT' ? 'pinterest-bot-card' : 'pinterest-manual-card';

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${cardSourceClass}`}>
      {/* Header */}
      <header style={{ backgroundColor: pageSettings.headerColor || '#ec4899' }} className="text-white py-6">
        <div className="container mx-auto px-4">
          <Link href={`/${slug}`} className="inline-flex items-center gap-2 text-sm hover:underline opacity-90 hover:opacity-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar para {pageSettings.displayName}
          </Link>
        </div>
      </header>

      {/* Card Detail */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <PublicCardDetail card={transformedCard} slug={slug} />
      </main>

      {/* Footer */}
      <PublicFooter displayName={pageSettings.displayName} />
    </div>
  );
}
