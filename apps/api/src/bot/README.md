# Telegram Bots

This directory contains all Telegram bot implementations for the Divulga Fácil platform.

## Available Bots

### 1. Arts Bot (`arts-bot.ts`)
**Purpose**: Generate art/image content for posts

**Token**: `TELEGRAM_BOT_ARTS_TOKEN`

**Commands**:
- `/start`: Initialize bot

### 2. Download Bot (`download-bot.ts`)
**Purpose**: Download media from various sources

**Token**: `TELEGRAM_BOT_DOWNLOAD_TOKEN`

**Commands**:
- `/start`: Initialize bot
- Send URL to download media

### 3. Pinterest Bot (`pinterest-bot.ts`)
**Purpose**: Pinterest integration and automation

**Token**: `TELEGRAM_BOT_PINTEREST_TOKEN`

**Commands**:
- `/start`: Initialize bot
- Pinterest-related commands

### 4. Suggestion Bot (`suggestion-bot.ts`) ⭐ NEW
**Purpose**: AI-powered product suggestions for affiliate marketers

**Token**: `TELEGRAM_BOT_SUGESTION_TOKEN`

**Commands**:
- `/start`: Show marketplace selection buttons

**Features**:
- 30-day smart caching
- Double-click refresh
- AI-powered suggestions via Perplexity API
- Promotional campaign injection
- Metrics-driven recommendations

**See**: [Feature 6 Documentation](../docs/FEATURE_6_SUGGESTIONS_BOT.md)

## Bot Registration

All bots are registered in `server.ts` and started in parallel:

```typescript
await Promise.all([
  artsBot.start(),
  startDownloadBot(),
  pinterestBot.start(),
  startSuggestionBot(),
]);
```

## Environment Variables

Create a `.env` file in the API root with the following tokens:

```env
# Required for all bots to work
TELEGRAM_BOT_ARTS_TOKEN=your_arts_bot_token
TELEGRAM_BOT_DOWNLOAD_TOKEN=your_download_bot_token
TELEGRAM_BOT_PINTEREST_TOKEN=your_pinterest_bot_token
TELEGRAM_BOT_SUGESTION_TOKEN=your_suggestion_bot_token

# Required for Suggestion Bot
PERPLEXITY_API_KEY=your_perplexity_api_key
```

## Creating a New Bot

1. **Get Bot Token**:
   - Message [@BotFather](https://t.me/BotFather) on Telegram
   - Send `/newbot`
   - Follow instructions to get token

2. **Create Bot File**:
   ```typescript
   // src/bot/my-bot.ts
   import { Bot } from 'grammy';

   const BOT_TOKEN = process.env.MY_BOT_TOKEN;

   if (!BOT_TOKEN) {
     console.warn('[MyBot] MY_BOT_TOKEN not configured!');
   }

   export const myBot = new Bot(BOT_TOKEN || '');

   myBot.command('start', async (ctx) => {
     await ctx.reply('Hello! I am MyBot.');
   });

   myBot.catch((err) => {
     console.error('[MyBot] Error:', err);
   });

   export async function startMyBot() {
     if (!BOT_TOKEN) {
       console.error('[MyBot] Cannot start - token not configured');
       return;
     }

     try {
       await myBot.start({
         onStart: (botInfo) => {
           console.log(`✅ MyBot started: @${botInfo.username}`);
         },
       });
     } catch (error) {
       console.error('[MyBot] Failed to start:', error);
       throw error;
     }
   }
   ```

3. **Register in Server**:
   ```typescript
   // src/server.ts
   import { startMyBot } from './bot/my-bot.js';

   // In the bot startup section:
   await Promise.all([
     artsBot.start(),
     startDownloadBot(),
     pinterestBot.start(),
     startSuggestionBot(),
     startMyBot(), // Add your bot here
   ]);
   ```

4. **Add Token to .env**:
   ```
   MY_BOT_TOKEN=your_bot_token_here
   ```

## Bot Framework

All bots use [grammY](https://grammy.dev/), a modern Telegram bot framework for Node.js.

### Features
- Type-safe API
- Middleware support
- Session management
- Inline keyboards
- File uploads/downloads
- Webhook support

### Example: Inline Keyboard

```typescript
import { InlineKeyboard } from 'grammy';

const keyboard = new InlineKeyboard()
  .text('Option 1', 'callback:option1')
  .text('Option 2', 'callback:option2')
  .row()
  .text('Option 3', 'callback:option3');

await ctx.reply('Choose an option:', {
  reply_markup: keyboard,
});

// Handle callbacks
myBot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data === 'callback:option1') {
    await ctx.answerCallbackQuery();
    await ctx.reply('You chose Option 1!');
  }
});
```

## Error Handling

All bots should include error handlers:

```typescript
myBot.catch((err) => {
  console.error('[MyBot] Error:', err);
});
```

## Testing Bots Locally

1. **Start the API server**:
   ```bash
   npm run dev
   ```

2. **Check logs for bot startup**:
   ```
   ✅ Telegram bots started successfully
   ```

3. **Message your bot on Telegram**:
   - Find bot by username (get from @BotFather)
   - Send `/start` command
   - Test bot commands

## Deployment

### Production Considerations

1. **Webhooks vs Long Polling**:
   - Current setup uses long polling (default)
   - For production, consider webhooks for better performance

2. **Rate Limiting**:
   - Telegram has rate limits (30 messages/second per chat)
   - Implement queuing for bulk operations

3. **Error Recovery**:
   - Bots auto-reconnect on connection loss
   - Monitor logs for persistent errors

4. **Security**:
   - Keep bot tokens secret
   - Validate user input
   - Implement user authorization where needed

## Troubleshooting

### Bot Not Starting

**Symptom**: Error "BOT_TOKEN not configured"

**Solution**: Check `.env` file has correct token

### Bot Responds Slowly

**Possible Causes**:
- Network latency
- API rate limits
- Heavy operations in handlers

**Solution**: Move heavy operations to background jobs

### Bot Stops Responding

**Possible Causes**:
- Server crash
- Network disconnection
- Telegram API issues

**Solution**: Check server logs, restart server if needed

## Resources

- [grammY Documentation](https://grammy.dev/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [BotFather](https://t.me/BotFather) - Create and manage bots
- [Bot API Updates](https://core.telegram.org/bots/api#recent-changes)

## Related Documentation

- [Feature 6: Suggestions Bot](../docs/FEATURE_6_SUGGESTIONS_BOT.md)
- [API Server Setup](../README.md)
- [Environment Configuration](../.env.example)
