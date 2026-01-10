import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * GET /r/:slug/:cardSlug
 * Redirect to affiliate URL with CTA click tracking
 *
 * This route handler proxies to the backend API which:
 * 1. Validates the card exists
 * 2. Records a PUBLIC_CTA_CLICK event
 * 3. Returns a 302 redirect to the affiliate URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; cardSlug: string }> }
) {
  const { slug, cardSlug } = await params;

  try {
    // Forward visitor identification headers to backend
    const headers: Record<string, string> = {
      'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
      'user-agent': request.headers.get('user-agent') || '',
      'referer': request.headers.get('referer') || '',
    };

    // Get visitor ID from cookie if exists
    const visitorId = request.cookies.get('df_vid')?.value;
    if (visitorId) {
      headers['x-visitor-id'] = visitorId;
    }

    // Call backend API to handle tracking and get redirect URL
    const response = await fetch(`${API_URL}/r/${slug}/${cardSlug}`, {
      method: 'GET',
      headers,
      redirect: 'manual', // Don't follow redirects automatically
    });

    // If backend returns a redirect, forward it to the client
    if (response.status === 302 || response.status === 301) {
      const redirectUrl = response.headers.get('location');

      if (redirectUrl) {
        return NextResponse.redirect(redirectUrl, { status: 302 });
      }
    }

    // If backend returns an error or card not found
    if (!response.ok) {
      // Redirect to the card detail page as fallback
      return NextResponse.redirect(
        new URL(`/${slug}/${cardSlug}`, request.url),
        { status: 302 }
      );
    }

    // Fallback: try to get affiliate URL from response body
    const data = await response.json().catch(() => null);
    if (data?.affiliateUrl) {
      return NextResponse.redirect(data.affiliateUrl, { status: 302 });
    }

    // Final fallback: redirect to card detail page
    return NextResponse.redirect(
      new URL(`/${slug}/${cardSlug}`, request.url),
      { status: 302 }
    );
  } catch (error) {
    console.error('Redirect route error:', error);

    // On error, redirect to card detail page
    return NextResponse.redirect(
      new URL(`/${slug}/${cardSlug}`, request.url),
      { status: 302 }
    );
  }
}
