# Manual QA Testing Checklist - Milestone 2: Dashboard de Gerenciamento

## Overview

This document provides a comprehensive checklist for manual QA testing of Milestone 2 features.

**Test Date**: _______________
**Tester Name**: _______________
**Environment**: ☐ Development ☐ Staging ☐ Production
**Browser**: ☐ Chrome ☐ Firefox ☐ Safari ☐ Edge
**Device**: ☐ Desktop ☐ Tablet ☐ Mobile

---

## 1. Bot Linking - ARTS Bot

### Test: Generate Token for ARTS Bot

**Steps**:
1. Login to dashboard
2. Navigate to "Meus Bots"
3. Locate "Bot de Artes" card
4. Click "Gerar Token" button
5. Observe token generation

**Expected Results**:
- ☐ Token appears immediately after clicking button
- ☐ Token is exactly 10 characters long
- ☐ Token contains only uppercase letters and numbers
- ☐ Instructions are displayed: "Envie /codigo TOKEN no bot"
- ☐ Bot handle shown: @DivulgaFacilArtesBot
- ☐ Expiration notice: "válido por 10 minutos"

**Actual Results**: _______________________________________

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

### Test: Token Expiration Warning

**Steps**:
1. Generate token for ARTS bot
2. Wait 10 minutes
3. Try to use expired token in Telegram

**Expected Results**:
- ☐ After 10 minutes, token is no longer valid
- ☐ Bot responds with "Token expirado" message
- ☐ User must generate new token

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

## 2. Bot Linking - DOWNLOAD Bot

### Test: Generate Token for DOWNLOAD Bot

**Steps**:
1. Navigate to "Meus Bots"
2. Locate "Bot de Download" card
3. Click "Gerar Token"

**Expected Results**:
- ☐ Token generated successfully
- ☐ Bot handle: @DivulgaFacilDownloadBot
- ☐ Instructions displayed correctly

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

## 3. Bot Linking - PINTEREST Bot

### Test: Generate Token for PINTEREST Bot

**Steps**:
1. Navigate to "Meus Bots"
2. Locate "Bot de Pinterest" card
3. Click "Gerar Token"

**Expected Results**:
- ☐ Token generated successfully
- ☐ Bot handle: @DivulgaFacilPinterestBot
- ☐ Instructions mention "criar cards automáticos"

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

## 4. Bot Linking - SUGGESTION Bot

### Test: Generate Token for SUGGESTION Bot

**Steps**:
1. Navigate to "Meus Bots"
2. Locate "Bot de Sugestões" card
3. Click "Gerar Token"

**Expected Results**:
- ☐ Token generated successfully
- ☐ Bot handle: @DivulgaFacilSugestaoBot
- ☐ Instructions mention "sugestões personalizadas"

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

## 5. Multiple Bot Linking

### Test: Link Multiple Bots Simultaneously

**Steps**:
1. Generate tokens for all 4 bots
2. Verify each token is unique
3. Link all bots in Telegram using respective tokens

**Expected Results**:
- ☐ All 4 tokens are different from each other
- ☐ Each bot can be linked independently
- ☐ Linked bots show "✓ Vinculado" badge
- ☐ After linking, no "Gerar Token" button appears

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

## 6. Página Pública - Appearance Customization

### Test: Update Display Name

**Steps**:
1. Navigate to "Página Pública"
2. Find "Nome de exibição" input
3. Clear existing value
4. Enter "My Test Store"
5. Click outside input (blur)
6. Wait for success message
7. Refresh page

**Expected Results**:
- ☐ Input accepts text input
- ☐ Success message appears after update
- ☐ Value persists after page refresh
- ☐ Public page reflects new display name

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

### Test: Update Header Color

**Steps**:
1. Navigate to "Página Pública"
2. Find "Cor do cabeçalho" color picker
3. Select a different color (e.g., #00FF00)
4. Click outside color picker
5. Refresh page

**Expected Results**:
- ☐ Color picker opens when clicked
- ☐ Selected color is saved
- ☐ Color persists after refresh
- ☐ Public page header uses new color

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

### Test: Update Bio

**Steps**:
1. Navigate to "Página Pública"
2. Find "Bio" textarea
3. Clear existing text
4. Enter: "Welcome to my store! Best deals in town."
5. Observe character counter
6. Click outside textarea
7. Refresh page

**Expected Results**:
- ☐ Textarea accepts text input
- ☐ Character counter updates in real-time
- ☐ Shows "X/500" format
- ☐ Bio saves successfully
- ☐ Bio persists after refresh
- ☐ Bio appears on public page

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

### Test: Bio Character Limit

**Steps**:
1. Navigate to "Página Pública"
2. Try to enter 501 characters in bio
3. Attempt to save

**Expected Results**:
- ☐ Textarea prevents input beyond 500 characters OR
- ☐ Error message appears when trying to save

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

## 7. Página Pública - Manual Card Creation

### Test: Create Card with All Fields

**Steps**:
1. Navigate to "Página Pública"
2. Click "+ Adicionar Card"
3. Fill all fields:
   - Título: "Test Product"
   - Preço: "R$ 99,90"
   - Preço original: "R$ 149,90"
   - Marketplace: "Mercado Livre"
   - Link do produto: "https://example.com/product"
   - Cupom: "SAVE10"
   - Descrição: "Amazing test product"
4. Upload an image file (JPG/PNG)
5. Click "Salvar Card"

**Expected Results**:
- ☐ Form opens when clicking "+ Adicionar Card"
- ☐ All fields accept input
- ☐ File upload accepts image files
- ☐ Success message appears after save
- ☐ Card appears in cards grid
- ☐ Card shows correct title, price, and image
- ☐ Card status is "ACTIVE" by default

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

### Test: Create Card with Minimum Required Fields

**Steps**:
1. Click "+ Adicionar Card"
2. Fill only required fields:
   - Título: "Minimal Card"
   - Preço: "R$ 50,00"
   - Link do produto: "https://example.com/minimal"
3. Upload image
4. Leave optional fields empty
5. Click "Salvar Card"

**Expected Results**:
- ☐ Card saves successfully
- ☐ Optional fields can be left empty
- ☐ Card displays correctly without optional data

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

### Test: Card Creation Validation

**Steps**:
1. Click "+ Adicionar Card"
2. Leave required fields empty
3. Click "Salvar Card"

**Expected Results**:
- ☐ Validation errors appear for required fields
- ☐ Form does not submit
- ☐ Error messages are clear and helpful

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

### Test: Image Upload Validation

**Steps**:
1. Try to create card without uploading image
2. Try to upload non-image file (e.g., PDF)
3. Try to upload very large image (>5MB)

**Expected Results**:
- ☐ Error: "Selecione uma imagem" when no file selected
- ☐ Error for invalid file types
- ☐ Error for files exceeding size limit

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

## 8. Página Pública - Card Management

### Test: View Cards List

**Steps**:
1. Create 3-5 cards
2. Navigate to "Página Pública"
3. Scroll to cards list

**Expected Results**:
- ☐ All created cards are displayed
- ☐ Cards show in grid layout (3 columns on desktop)
- ☐ Each card shows: image, title, price, status badges
- ☐ Cards display source badge (MANUAL)
- ☐ Cards display status badge (ACTIVE/HIDDEN)

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

### Test: Toggle Card Status (Hide)

**Steps**:
1. Find a card with "ACTIVE" status
2. Click "Ocultar" button
3. Observe status change
4. Refresh page

**Expected Results**:
- ☐ Status changes from "ACTIVE" to "HIDDEN"
- ☐ Button text changes to "Ativar"
- ☐ Status persists after refresh
- ☐ Hidden card does NOT appear on public page

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

### Test: Toggle Card Status (Activate)

**Steps**:
1. Find a card with "HIDDEN" status
2. Click "Ativar" button
3. Observe status change

**Expected Results**:
- ☐ Status changes from "HIDDEN" to "ACTIVE"
- ☐ Button text changes to "Ocultar"
- ☐ Active card appears on public page

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

### Test: Delete Card

**Steps**:
1. Find a card to delete
2. Click "Remover" button
3. Confirm deletion in dialog
4. Observe card removal

**Expected Results**:
- ☐ Confirmation dialog appears
- ☐ Dialog asks "Deseja realmente remover este card?"
- ☐ After confirming, card is removed from list
- ☐ Card no longer appears after refresh
- ☐ Card is removed from public page

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

### Test: Cancel Card Deletion

**Steps**:
1. Click "Remover" on a card
2. Click "Cancel" in confirmation dialog

**Expected Results**:
- ☐ Dialog closes
- ☐ Card remains in list
- ☐ No changes made

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

## 9. Dashboard Overview - Metrics Display

### Test: View Bot Metrics

**Steps**:
1. Navigate to dashboard home
2. Observe bot metrics cards

**Expected Results**:
- ☐ "Bots de arte ativos" card displays count
- ☐ "Bots de download ativos" card displays count
- ☐ Counts update when bots are linked
- ☐ Zero state message appears when no bots linked

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

### Test: View Usage Metrics

**Steps**:
1. Navigate to dashboard home
2. Observe usage metrics cards

**Expected Results**:
- ☐ "Artes geradas" card displays count
- ☐ "Quantidade de downloads" card displays count
- ☐ "Neste mês" subtitle appears
- ☐ Counts show real data when available

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

### Test: View Public Page Analytics

**Steps**:
1. Create some manual cards
2. Visit public page to generate views
3. Click on cards to generate clicks
4. Return to dashboard

**Expected Results**:
- ☐ "Página Pública" card appears (if data exists)
- ☐ Shows "Visualizações" count
- ☐ Shows "Cliques" count
- ☐ Shows "CTR" percentage
- ☐ Link to "Gerenciar página →" works

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

## 10. Public Page - Frontend Display

### Test: View Public Page

**Steps**:
1. Navigate to "Página Pública"
2. Click "📄 Visualizar Página" button
3. Observe public page in new tab

**Expected Results**:
- ☐ Public page opens in new tab
- ☐ URL format: /p/{user-slug}
- ☐ Display name appears in header
- ☐ Header uses customized color
- ☐ Bio appears below header
- ☐ Only ACTIVE cards are displayed
- ☐ Cards are clickable and link to affiliate URLs

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

### Test: Public Page Responsiveness

**Steps**:
1. Open public page
2. Resize browser window
3. Test on mobile device

**Expected Results**:
- ☐ Layout adapts to different screen sizes
- ☐ Cards stack vertically on mobile
- ☐ Header remains visible
- ☐ Images scale appropriately

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

## 11. Navigation and UI

### Test: Sidebar Navigation

**Steps**:
1. Login to dashboard
2. Click each sidebar menu item

**Expected Results**:
- ☐ "Início" navigates to /dashboard
- ☐ "Assinatura" navigates to /dashboard/subscription
- ☐ "🤖 Meus Bots" navigates to /dashboard/meus-bots
- ☐ "🏪 Página Pública" navigates to /dashboard/pagina-publica
- ☐ "Telegram" navigates to /dashboard/telegram
- ☐ "Branding" navigates to /dashboard/branding
- ☐ "❓ Ajuda" navigates to /dashboard/ajuda
- ☐ All navigation items are visible
- ☐ Active page is highlighted

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

### Test: User Info Display

**Steps**:
1. Login to dashboard
2. Check sidebar top section

**Expected Results**:
- ☐ User email is displayed
- ☐ User role is displayed
- ☐ Information is accurate

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

## 12. Help/FAQ Page

### Test: View FAQ Content

**Steps**:
1. Navigate to "Ajuda"
2. Scroll through all sections

**Expected Results**:
- ☐ "Perguntas Gerais" section exists
- ☐ "Bot de Artes" section exists with FAQs
- ☐ "Bot de Download" section exists with FAQs
- ☐ "Bot de Pinterest" section exists with FAQs
- ☐ "Bot de Sugestões" section exists with FAQs
- ☐ "Assinatura e Limites" section exists
- ☐ "Suporte" section exists
- ☐ All content is in Portuguese
- ☐ Information is clear and helpful

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

### Test: Bot Linking Instructions in FAQ

**Steps**:
1. Navigate to "Ajuda"
2. Find "Como funciona a vinculação de bots?"

**Expected Results**:
- ☐ Step-by-step instructions are provided
- ☐ Instructions mention /codigo command
- ☐ Token expiration (10 minutes) is mentioned
- ☐ Instructions match actual bot linking flow

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

## 13. Error Handling

### Test: API Error Handling

**Steps**:
1. Disconnect internet
2. Try to generate token
3. Try to save card
4. Try to update settings

**Expected Results**:
- ☐ User-friendly error messages appear
- ☐ No cryptic error codes shown
- ☐ UI doesn't crash or freeze
- ☐ User can retry after error

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

### Test: Authentication Error

**Steps**:
1. Clear cookies/logout
2. Try to access /dashboard/meus-bots directly

**Expected Results**:
- ☐ User is redirected to login page
- ☐ After login, user is redirected back to intended page

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

## 14. Performance

### Test: Page Load Time

**Steps**:
1. Clear browser cache
2. Navigate to dashboard pages
3. Measure load time

**Expected Results**:
- ☐ Dashboard loads in < 3 seconds
- ☐ "Meus Bots" page loads in < 2 seconds
- ☐ "Página Pública" page loads in < 3 seconds
- ☐ No noticeable lag or freezing

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

### Test: Image Upload Performance

**Steps**:
1. Upload 5MB image (max size)
2. Observe upload and processing time

**Expected Results**:
- ☐ Upload completes in < 10 seconds
- ☐ Progress indicator shown during upload
- ☐ WebP conversion happens server-side
- ☐ Final image is optimized

**Status**: ☐ Pass ☐ Fail ☐ Blocked

---

## 15. Browser Compatibility

### Test: Chrome

**Browser Version**: __________

**Status**: ☐ All features working ☐ Issues found (describe below)

**Notes**: _______________________________________

---

### Test: Firefox

**Browser Version**: __________

**Status**: ☐ All features working ☐ Issues found (describe below)

**Notes**: _______________________________________

---

### Test: Safari

**Browser Version**: __________

**Status**: ☐ All features working ☐ Issues found (describe below)

**Notes**: _______________________________________

---

### Test: Edge

**Browser Version**: __________

**Status**: ☐ All features working ☐ Issues found (describe below)

**Notes**: _______________________________________

---

## Issues Found

| # | Severity | Component | Description | Steps to Reproduce | Status |
|---|----------|-----------|-------------|-------------------|--------|
| 1 |          |           |             |                   |        |
| 2 |          |           |             |                   |        |
| 3 |          |           |             |                   |        |

**Severity Levels**: Critical, High, Medium, Low

---

## Summary

**Total Tests**: 50+
**Passed**: ___________
**Failed**: ___________
**Blocked**: ___________

**Overall Status**: ☐ Ready for Release ☐ Needs Fixes ☐ Major Issues

**Sign-off**:

Tester: _______________  Date: _______________

Lead Developer: _______________  Date: _______________
