import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * POST /api/revalidate
 * On-demand cache revalidation endpoint
 *
 * Called by the backend API when public page settings or cards are updated.
 * This ensures the public page reflects changes immediately without manual refresh.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the request has the correct secret token
    const authHeader = request.headers.get('x-revalidate-token');
    const expectedToken = process.env.REVALIDATE_SECRET_TOKEN;

    // If token is configured, verify it
    if (expectedToken && authHeader !== expectedToken) {
      return NextResponse.json(
        { error: 'Invalid revalidation token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { slug, cardSlug, type } = body;

    if (!slug) {
      return NextResponse.json(
        { error: 'slug is required' },
        { status: 400 }
      );
    }

    // Revalidate based on type
    switch (type) {
      case 'settings':
        // Revalidate public profile page
        revalidatePath(`/${slug}`);
        console.log(`[Revalidate] Revalidated settings for /${slug}`);
        break;

      case 'card':
        // Revalidate specific card page
        if (cardSlug) {
          revalidatePath(`/${slug}/${cardSlug}`);
          console.log(`[Revalidate] Revalidated card /${slug}/${cardSlug}`);
        }
        // Also revalidate the profile page (card list may have changed)
        revalidatePath(`/${slug}`);
        console.log(`[Revalidate] Revalidated profile /${slug}`);
        break;

      case 'all':
        // Revalidate everything for this user
        revalidatePath(`/${slug}`);
        // Note: Can't easily revalidate all card pages, but the profile page shows all cards
        console.log(`[Revalidate] Revalidated all for /${slug}`);
        break;

      default:
        // Default: revalidate profile page
        revalidatePath(`/${slug}`);
        console.log(`[Revalidate] Revalidated default /${slug}`);
    }

    return NextResponse.json({
      revalidated: true,
      now: Date.now(),
      slug,
      type: type || 'default'
    });
  } catch (error) {
    console.error('[Revalidate] Error:', error);
    return NextResponse.json(
      { error: 'Failed to revalidate', details: String(error) },
      { status: 500 }
    );
  }
}
