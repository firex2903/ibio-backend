# Twitch Extension Submission Checklist

## Extension Manifest (`extension.json`)

- [ ] `extension_id` matches the Client ID from the Twitch Dev Console
- [ ] All 5 views listed under `views` with correct URLs
- [ ] `config` points to `/config.html`
- [ ] `live_config` points to `/live-config.html`
- [ ] `panel`, `video_overlay`, `mobile` views registered
- [ ] `required_broadcaster_ability` is empty or minimal

## Permissions & APIs

- [ ] No calls to external APIs not whitelisted in the manifest `allowlist`
- [ ] `https://api.creatorbiohub.com` is in the EBS allowlist
- [ ] No `window.location` redirects outside Twitch-approved domains
- [ ] All links open in `target="_blank"` (extension cannot navigate the parent page)

## Twitch Policy Compliance

- [ ] Live dot / "On Air" badge is only shown when `playbackMode === 'video' && !isPaused` (verified in `Overlay.tsx`)
- [ ] No hardcoded claims about stream state
- [ ] No competitor platform branding or promotion in UI copy
- [ ] No user PII collected beyond what Twitch provides
- [ ] No payment flows inside the extension iframe (Stripe billing is in the dashboard, not the panel)
- [ ] No iframes nested inside extension views
- [ ] No `alert()`, `confirm()`, or `prompt()` calls
- [ ] Extension does not modify the Twitch page DOM outside its iframe

## Content & Branding

- [ ] All copy reviewed for Twitch-safe language (no "sponsored" without disclosure)
- [ ] No Twitch trademark misuse (do not call product "Twitch Pro" etc.)
- [ ] Screenshots provided for all views (Panel, Overlay, Mobile, Config, Live Config)
- [ ] Promo art provided: small (80×80), medium (320×160), large (1920×1080)
- [ ] Description field accurately describes what the extension does
- [ ] Category: `Tools`, sub-category: `Productivity`

## Security

- [ ] Twitch JWT verified on every backend endpoint that accepts viewer/broadcaster data
- [ ] `TWITCH_EXT_SECRET` never exposed to the client bundle
- [ ] No sensitive keys in the Vite build output (`VITE_` prefix only for non-secret vars)
- [ ] Rate limiting applied on the EBS (`@fastify/rate-limit`)
- [ ] Stripe webhook signature verified via `stripe.webhooks.constructEvent`
- [ ] CORS restricted to `*.twitch.tv` and `*.extension-files.twitch.tv`

## Technical

- [ ] `tsc --noEmit` passes with zero errors across all packages
- [ ] All 5 HTML entry points build cleanly (`pnpm --filter @creator-bio-hub/extension build`)
- [ ] EBS health endpoint (`GET /health`) returns `{ ok: true }` with 200
- [ ] Prisma migrations committed and `migrate deploy` tested
- [ ] Extension tested in Twitch Developer Rig (all 5 views)
- [ ] Extension tested on real Twitch channel (Broadcaster, Moderator, Viewer roles)
- [ ] Mobile view tested on an actual mobile device or Rig mobile emulator

## Pre-submission

- [ ] Version bumped in `extension.json` (e.g. `1.0.0`)
- [ ] `packages/extension/dist/` built fresh and zipped for upload
- [ ] EBS deployed and accessible at `https://api.creatorbiohub.com`
- [ ] All env vars set in production (no placeholder values)
- [ ] Stripe webhook endpoint registered at `https://api.creatorbiohub.com/v1/webhooks/stripe`
