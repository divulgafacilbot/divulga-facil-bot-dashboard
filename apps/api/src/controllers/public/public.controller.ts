import { Request, Response } from 'express';
import { PublicPageService } from '../../services/pinterest/public-page.service.js';
import { CardService } from '../../services/card.service.js';
import { PublicEventService } from '../../services/public-event.service.js';

export class PublicController {
  /**
   * GET /<slug>
   * Get public profile with first page of cards
   */
  static async getPublicProfile(req: Request, res: Response) {
    try {
      const { slug } = req.params;

      // Get page settings
      const pageSettings = await PublicPageService.getBySlug(slug);

      if (!pageSettings) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      // Get first page of cards (24 items, only ACTIVE)
      const result = await CardService.listCards({
        userId: pageSettings.user_id,
        limit: 24,
        status: 'ACTIVE'
      });

      return res.json({
        pageSettings: {
          displayName: pageSettings.display_name,
          headerColor: pageSettings.header_color,
          titleColor: pageSettings.title_color,
          headerImageUrl: pageSettings.header_image_url,
          bio: pageSettings.bio
        },
        cards: {
          items: result.cards,
          hasMore: result.nextCursor !== null,
          nextCursor: result.nextCursor
        }
      });
    } catch (error) {
      console.error('Error getting public profile:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /<slug>/<cardSlug>
   * Get individual card
   */
  static async getPublicCard(req: Request, res: Response) {
    try {
      const { slug, cardSlug } = req.params;

      // Get page settings
      const pageSettings = await PublicPageService.getBySlug(slug);

      if (!pageSettings) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      // Get card (only if ACTIVE)
      const card = await CardService.getCardBySlug(
        pageSettings.user_id,
        cardSlug,
        false // includeHidden = false
      );

      if (!card) {
        return res.status(404).json({ error: 'Card not found' });
      }

      return res.json({
        pageSettings: {
          displayName: pageSettings.display_name,
          headerColor: pageSettings.header_color,
          titleColor: pageSettings.title_color,
          headerImageUrl: pageSettings.header_image_url,
          bio: pageSettings.bio
        },
        card
      });
    } catch (error) {
      console.error('Error getting public card:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/public/<slug>/cards
   * List cards with cursor pagination
   */
  static async listCards(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const { cursor, limit, marketplace, category } = req.query;

      // Get page settings
      const pageSettings = await PublicPageService.getBySlug(slug);

      if (!pageSettings) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      // List cards (only ACTIVE)
      const result = await CardService.listCards({
        userId: pageSettings.user_id,
        cursor: cursor as string,
        limit: limit ? parseInt(limit as string, 10) : 24,
        marketplace: marketplace as any,
        category: category as string,
        status: 'ACTIVE'
      });

      return res.json(result);
    } catch (error) {
      console.error('Error listing cards:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /r/<slug>/<cardSlug>
   * Redirect to affiliate URL with tracking
   */
  static async redirectToAffiliate(req: Request, res: Response) {
    try {
      const { slug, cardSlug } = req.params;

      // Get page settings
      const pageSettings = await PublicPageService.getBySlug(slug);

      if (!pageSettings) {
        return res.status(404).send('Profile not found');
      }

      // Get card (only if ACTIVE)
      const card = await CardService.getCardBySlug(
        pageSettings.user_id,
        cardSlug,
        false // includeHidden = false
      );

      if (!card) {
        return res.status(404).send('Card not found');
      }

      // Track CTA click (fail silently)
      try {
        await PublicEventService.trackCtaClick({
          userId: pageSettings.user_id,
          cardId: card.id,
          marketplace: card.marketplace,
          source: card.source,
          referrer: req.headers.referer,
          utmSource: req.query.utm_source as string,
          utmMedium: req.query.utm_medium as string,
          utmCampaign: req.query.utm_campaign as string,
          visitorId: (req as any).visitorId, // From visitor-id middleware
          ipHash: (req as any).ipHash, // From visitor-id middleware
          userAgent: req.headers['user-agent'],
          isDuplicate: (req as any).isDuplicate, // From dedupe middleware
          isBot: (req as any).isBot // From bot-filter middleware
        });
      } catch (trackingError) {
        console.error('Tracking error (non-blocking):', trackingError);
      }

      // Redirect to affiliate URL
      return res.redirect(302, card.affiliate_url);
    } catch (error) {
      console.error('Error redirecting to affiliate:', error);
      return res.status(500).send('Internal server error');
    }
  }

  /**
   * POST /api/public/events
   * Track event (views, clicks)
   */
  static async trackEvent(req: Request, res: Response) {
    try {
      const { eventType, slug, cardSlug, referrer, utmSource, utmMedium, utmCampaign } = req.body;

      // Get page settings
      const pageSettings = await PublicPageService.getBySlug(slug);

      if (!pageSettings) {
        // Return 204 to not break UX
        return res.status(204).send();
      }

      let cardId: string | undefined;
      let marketplace: any;
      let source: any;

      // Get card if cardSlug provided
      if (cardSlug) {
        const card = await CardService.getCardBySlug(
          pageSettings.user_id,
          cardSlug,
          false // includeHidden = false
        );

        if (card) {
          cardId = card.id;
          marketplace = card.marketplace;
          source = card.source;
        }
      }

      // Track event based on type
      const baseEventData = {
        userId: pageSettings.user_id,
        referrer,
        utmSource,
        utmMedium,
        utmCampaign,
        visitorId: (req as any).visitorId, // From visitor-id middleware
        ipHash: (req as any).ipHash, // From visitor-id middleware
        userAgent: req.headers['user-agent'],
        isDuplicate: (req as any).isDuplicate, // From dedupe middleware
        isBot: (req as any).isBot // From bot-filter middleware
      };

      if (eventType === 'PUBLIC_PROFILE_VIEW') {
        await PublicEventService.trackPageView(baseEventData);
      } else if (eventType === 'PUBLIC_CARD_VIEW' && cardId) {
        await PublicEventService.trackCardView({
          ...baseEventData,
          cardId,
          marketplace,
          source
        });
      } else if ((eventType === 'PUBLIC_CTA_CLICK' || eventType === 'PUBLIC_CARD_CLICK') && cardId) {
        await PublicEventService.trackCtaClick({
          ...baseEventData,
          cardId,
          marketplace,
          source
        });
      }

      // Always return 204
      return res.status(204).send();
    } catch (error) {
      // Always return 204 to not break UX
      return res.status(204).send();
    }
  }
}
