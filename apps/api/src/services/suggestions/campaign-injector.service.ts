import { prisma } from '../../db/prisma';
import { getDayKey, nowBrt } from '../../utils/time';
import { SUGGESTION_CONSTANTS } from '../../constants/suggestions.constants';
import type { Marketplace, ProductSuggestion, MarketplaceSuggestions } from '../../types/suggestions.types';

export interface CampaignInjectionResult {
  suggestions: MarketplaceSuggestions;
  injectedCount: number;
  marketplaces: Marketplace[];
}

export class CampaignInjectorService {
  /**
   * Inject promotional campaigns into suggestions
   * Replaces the 5th suggestion (index 4) with an active campaign if available
   */
  async injectCampaigns(suggestions: MarketplaceSuggestions): Promise<CampaignInjectionResult> {
    console.log('[CampaignInjector] injectCampaigns called');
    const result = { ...suggestions };
    const injectedMarketplaces: Marketplace[] = [];

    console.log('[CampaignInjector] Processing marketplaces:', SUGGESTION_CONSTANTS.MARKETPLACES);
    for (const marketplace of SUGGESTION_CONSTANTS.MARKETPLACES) {
      console.log('[CampaignInjector] Processing marketplace:', marketplace);
      const marketplaceSuggestions = result[marketplace];

      if (!marketplaceSuggestions || marketplaceSuggestions.length < SUGGESTION_CONSTANTS.SUGGESTIONS_PER_MARKETPLACE) {
        console.log('[CampaignInjector] Skipping', marketplace, '- insufficient suggestions');
        continue;
      }

      // Get eligible campaign
      const campaign = await this.getEligibleCampaign(marketplace);

      if (!campaign) {
        console.log('[CampaignInjector] No eligible campaign for', marketplace);
        continue;
      }

      // Replace the 5th suggestion (index 4)
      const injectedSuggestion: ProductSuggestion = {
        title: campaign.product_title,
        search_term: campaign.product_title, // Use title as search term for campaigns
        url: campaign.product_url, // Campaigns have real URLs, not Google Search links
        hook_angle: campaign.hook_angle || 'Campanha promocional',
        category: campaign.category as any || 'Outros',
        estimated_price: 'Varia',
      };

      marketplaceSuggestions[SUGGESTION_CONSTANTS.CAMPAIGN_SUBSTITUTION_INDEX] = injectedSuggestion;

      // Update rotation state
      await this.updateRotationState(marketplace, campaign.id);

      // Track injected marketplace
      injectedMarketplaces.push(marketplace);

      console.log('[CampaignInjector] Injected campaign for', marketplace, ':', campaign.name);
    }

    return {
      suggestions: result,
      injectedCount: injectedMarketplaces.length,
      marketplaces: injectedMarketplaces,
    };
  }

  /**
   * Get eligible campaign for marketplace
   * - Must be active
   * - Must match marketplace
   * - Must not have been used in the last N days (cooldown)
   * - Prioritize by priority field
   */
  private async getEligibleCampaign(marketplace: Marketplace) {
    console.log('[CampaignInjector] getEligibleCampaign for marketplace:', marketplace);
    const currentDayKey = getDayKey(nowBrt());
    console.log('[CampaignInjector] Current day key:', currentDayKey);

    // Get rotation state
    console.log('[CampaignInjector] Getting rotation state...');
    const rotationState = await prisma.campaign_rotation_state.findUnique({
      where: { marketplace },
    });
    console.log('[CampaignInjector] Rotation state:', rotationState ? 'found' : 'not found');

    // Get all active campaigns for this marketplace
    console.log('[CampaignInjector] Getting active campaigns...');
    const campaigns = await prisma.promotional_campaigns.findMany({
      where: {
        marketplace,
        is_active: true,
      },
      orderBy: [
        { priority: 'desc' },
        { created_at: 'desc' },
      ],
    });
    console.log('[CampaignInjector] Active campaigns found:', campaigns.length);

    if (campaigns.length === 0) {
      console.log('[CampaignInjector] No active campaigns for', marketplace);
      return null;
    }

    // Check cooldown
    if (rotationState && rotationState.last_campaign_id && rotationState.last_used_day_key) {
      const daysSinceLastUse = this.calculateDayDiff(rotationState.last_used_day_key, currentDayKey);

      if (daysSinceLastUse < SUGGESTION_CONSTANTS.CAMPAIGN_COOLDOWN_DAYS) {
        // Still in cooldown period, filter out last campaign
        const eligibleCampaigns = campaigns.filter(c => c.id !== rotationState.last_campaign_id);

        if (eligibleCampaigns.length > 0) {
          return eligibleCampaigns[0];
        }

        // No other campaigns available, use the same one
        return campaigns[0];
      }
    }

    // No cooldown restrictions, return highest priority
    return campaigns[0];
  }

  /**
   * Update rotation state after using a campaign
   */
  private async updateRotationState(marketplace: Marketplace, campaignId: string) {
    const currentDayKey = getDayKey(nowBrt());

    await prisma.campaign_rotation_state.upsert({
      where: { marketplace },
      create: {
        marketplace,
        last_campaign_id: campaignId,
        last_used_day_key: currentDayKey,
      },
      update: {
        last_campaign_id: campaignId,
        last_used_day_key: currentDayKey,
      },
    });
  }

  /**
   * Calculate difference between two day keys (YYYY-MM-DD format)
   */
  private calculateDayDiff(dayKey1: string, dayKey2: string): number {
    const date1 = new Date(dayKey1);
    const date2 = new Date(dayKey2);
    const diffMs = Math.abs(date2.getTime() - date1.getTime());
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
}

export const campaignInjectorService = new CampaignInjectorService();
