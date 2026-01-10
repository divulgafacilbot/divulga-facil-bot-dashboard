/**
 * Frontend tracking script
 * Sends events to the API for analytics
 */

import { getOrCreateVisitorId } from './visitor';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type EventType =
  | 'PUBLIC_PROFILE_VIEW'
  | 'PUBLIC_CARD_VIEW'
  | 'PUBLIC_CTA_CLICK'
  | 'PUBLIC_CARD_CLICK';

interface TrackEventOptions {
  eventType: EventType;
  slug: string;
  cardSlug?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

/**
 * Extract UTM parameters from URL
 */
function getUTMParams(): {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
} {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get('utm_source') || undefined,
    utmMedium: params.get('utm_medium') || undefined,
    utmCampaign: params.get('utm_campaign') || undefined
  };
}

/**
 * Track an event
 * Fails silently to not break UX
 */
export async function trackEvent(options: TrackEventOptions): Promise<void> {
  try {
    const visitorId = getOrCreateVisitorId();
    const utmParams = getUTMParams();

    const payload = {
      eventType: options.eventType,
      slug: options.slug,
      cardSlug: options.cardSlug,
      visitorId,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      utmSource: options.utmSource || utmParams.utmSource,
      utmMedium: options.utmMedium || utmParams.utmMedium,
      utmCampaign: options.utmCampaign || utmParams.utmCampaign
    };

    // Send beacon for reliable tracking (even if page unloads)
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(`${API_URL}/api/public/events`, blob);
    } else {
      // Fallback to fetch
      await fetch(`${API_URL}/api/public/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        keepalive: true
      });
    }
  } catch (error) {
    // Fail silently to not break UX
    console.debug('Tracking error (non-blocking):', error);
  }
}

/**
 * Track profile view
 */
export function trackProfileView(slug: string): void {
  trackEvent({
    eventType: 'PUBLIC_PROFILE_VIEW',
    slug
  });
}

/**
 * Track card view
 */
export function trackCardView(slug: string, cardSlug: string): void {
  trackEvent({
    eventType: 'PUBLIC_CARD_VIEW',
    slug,
    cardSlug
  });
}

/**
 * Track card click
 */
export function trackCardClick(slug: string, cardSlug: string): void {
  trackEvent({
    eventType: 'PUBLIC_CARD_CLICK',
    slug,
    cardSlug
  });
}

/**
 * Track CTA click
 */
export function trackCTAClick(slug: string, cardSlug: string): void {
  trackEvent({
    eventType: 'PUBLIC_CTA_CLICK',
    slug,
    cardSlug
  });
}
