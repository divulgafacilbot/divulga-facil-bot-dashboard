import { Router, Request, Response } from 'express';
import { KiwifyWebhookService, KiwifyEventPayload, WebhookHeaders } from '../services/billing/kiwify-webhook.service.js';
import { EventProcessorService } from '../services/billing/event-processor.service.js';
import { AuditService, AuditAction } from '../services/audit/audit.service.js';

const router = Router();

/**
 * POST /webhooks/kiwify
 * Receive Kiwify webhook events
 *
 * Security:
 * - Validates HMAC-SHA256 signature (from body or headers)
 * - Optionally validates timestamp if provided in headers
 * - Idempotent - duplicate events return 200 without reprocessing
 *
 * Note: Kiwify sends signature in body.signature, not in headers
 * The real payload has nested structure: { signature, order: {...} }
 */
router.post('/kiwify', async (req: Request, res: Response) => {
  try {
    // Parse payload
    const payload: KiwifyEventPayload = req.body;

    // DEBUG: Log full webhook payload to identify product_id
    console.log('='.repeat(60));
    console.log('[KIWIFY WEBHOOK] Payload recebido:');
    console.log(JSON.stringify(payload, null, 2));
    if (payload.order?.Product) {
      console.log('[KIWIFY WEBHOOK] Product ID:', payload.order.Product.product_id);
      console.log('[KIWIFY WEBHOOK] Product Name:', payload.order.Product.product_name);
    }
    console.log('='.repeat(60));

    // Extract signature - Kiwify sends it in body, not headers
    const signature = KiwifyWebhookService.extractSignature(payload)
      || (req.headers['x-kiwify-signature'] as string)
      || '';

    // Timestamp is optional - Kiwify may not send it
    const timestamp = (req.headers['x-kiwify-timestamp'] as string) || '';

    // Get raw body for signature validation
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // Only validate timestamp if provided (Kiwify doesn't always send it)
    if (timestamp && !KiwifyWebhookService.isTimestampValid(timestamp)) {
      console.warn('Webhook rejected: timestamp too old or invalid');
      return res.status(400).json({
        error: 'Invalid timestamp',
        message: 'Request timestamp is too old or invalid',
      });
    }

    // Validate signature if KIWIFY_WEBHOOK_SECRET is configured
    if (process.env.KIWIFY_WEBHOOK_SECRET) {
      // For body signature, we need to validate against the order object only
      const payloadToValidate = payload.signature && payload.order
        ? JSON.stringify(payload.order)
        : rawBody;

      if (!KiwifyWebhookService.validateSignature(payloadToValidate, signature, timestamp || String(Date.now() / 1000))) {
        console.warn('Webhook rejected: invalid signature');
        return res.status(400).json({
          error: 'Invalid signature',
          message: 'Webhook signature validation failed',
        });
      }
    }

    // Extract event ID from nested order object or legacy format
    const extractedData = KiwifyWebhookService.extractPayloadData(payload);
    const eventId = extractedData.eventId || extractedData.transactionId || `webhook-${Date.now()}`;

    // Extract event type from nested order or legacy format
    const eventType = KiwifyWebhookService.extractEventType(payload)
      || (req.body.event_type as string)
      || (req.body.type as string)
      || 'unknown';

    // Build headers object for storage
    const headers: WebhookHeaders = {
      'x-kiwify-signature': signature,
      'x-kiwify-timestamp': timestamp,
    };

    // Log receipt
    await AuditService.logAction({
      action: AuditAction.WEBHOOK_RECEIVED,
      entity_type: 'kiwify_event',
      entity_id: eventId,
      metadata: { eventType },
    });

    // Persist event (idempotent)
    const event = await KiwifyWebhookService.persistEvent(
      eventId,
      eventType,
      payload,
      headers,
      signature
    );

    // Check if already processed
    const alreadyProcessed = await KiwifyWebhookService.isEventProcessed(eventId);
    if (alreadyProcessed) {
      // Return 200 for idempotency (Kiwify will retry on non-200)
      return res.status(200).json({
        success: true,
        message: 'Event already processed',
        eventId,
      });
    }

    // Trigger async processing (fire and forget)
    // Don't await - return 200 immediately
    setImmediate(async () => {
      try {
        await EventProcessorService.processEvent(eventId);
      } catch (error) {
        console.error(`Async event processing failed for ${eventId}:`, error);
      }
    });

    // Return 200 immediately
    return res.status(200).json({
      success: true,
      message: 'Event received and queued for processing',
      eventId,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);

    // Still return 200 to prevent Kiwify retries on our internal errors
    // The event was already persisted, we can reprocess later
    return res.status(200).json({
      success: true,
      message: 'Event received (processing may be delayed)',
    });
  }
});

/**
 * GET /webhooks/health
 * Health check endpoint for webhooks
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'webhooks',
    timestamp: new Date().toISOString(),
  });
});

export default router;
