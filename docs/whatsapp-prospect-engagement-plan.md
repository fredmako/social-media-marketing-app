# WhatsApp Prospect Engagement — Implementation Plan

## 1) Current State & Gaps
- Leads exist but phone capture is not enforced; UI only loads leads and marks them void.
- No engagement records, templates, or campaign-level WhatsApp flows exist.
- WhatsApp MCP exists only as an outbound post path (`post_to_whatsapp`); no inbound lead capture or CRM-style engagement execute path.
- No follow-up/engagement scheduler; only social-publish and analytics cron jobs.
- No phone normalization/verification, consent tracking, or opt-out handling.

## 2) Data Model Additions
Add to `Lead`:
- `consentWhatsapp` boolean default false
- `optOutAt` datetime optional
- `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm` optional for attribution
- phone validation/normalization guidance: enforce E.164 in app before insert; store normalized form ending with digits after trimming spaces

New tables:
- `WhatsAppTemplate` for reusable message variants with tenant scoping, status, and vars for personalization
- `WhatsAppEngagement` for individual/batch sends linked to lead with type + status + platformMessageId + errorMessage + sentAt + readAt + repliedAt

SQLite DDL additions:
- `ALTER TABLE Lead ADD COLUMN consentWhatsapp INTEGER DEFAULT 0;`
- `ALTER TABLE Lead ADD COLUMN optOutAt TEXT;`
- `ALTER TABLE Lead ADD COLUMN utmSource TEXT;`
- `ALTER TABLE Lead ADD COLUMN utmMedium TEXT;`
- `ALTER TABLE Lead ADD COLUMN utmCampaign TEXT;`
- `ALTER TABLE Lead ADD COLUMN utmContent TEXT;`
- `ALTER TABLE Lead ADD COLUMN utmTerm TEXT;`
- `CREATE TABLE WhatsAppTemplate(...)`
- `CREATE TABLE WhatsAppEngagement(...)`

## 3) Backend API Endpoints
Leads/Prospects:
- `POST /api/prospects` create capture with phone + consent + UTM
- `GET /api/prospects` tenant-scoped list with filters status/source/search
- `PATCH /api/prospects/:id` update status/score/notes/optOut
- `POST /api/prospects/import` CSV/text import batch
- `POST /api/prospects/:id/verify-phone` stub + E.164 hints
- `POST /api/prospects/consent` record opt-in/opt-out

Templates:
- `GET /api/whatsapp/templates`
- `POST /api/whatsapp/templates`
- `PATCH /api/whatsapp/templates/:id`
- `POST /api/whatsapp/templates/:id/preview` rendered sample

Engagement:
- `POST /api/whatsapp/send` send single message
- `POST /api/whatsapp/send-batch` send sequenced campaign to leads
- `GET /api/whatsapp/engagements` list by tenant with filters leadId/templateId/status
- `POST /api/whatsapp/engagements/:id/mark-sent`
- `POST /api/whatsapp/engagements/:id/mark-read`
- `POST /api/whatsapp/engagements/:id/mark-replied`
- `POST /api/whatsapp/:leadId/inbound` optional webhook receiver

## 4) MCP/Tooling Requirements
Reuse existing MCP path:
- Extend `postToPlatform` to accept typed WhatsApp send args: `recipientPhone` plus optional `templateId` reference for enforcing preapproved templates
- Add `send_whatsapp_template` alongside `post_to_whatsapp` if the WhatsApp MCP supports templates
- Add `reply_to_whatsapp`, `mark_whatsapp_read` if two-way tracking is needed
- Keep fallback mock path so demo runs continue to work without active MCP

Server-side queue:
- Introduce lightweight job queue or retry table for sends, with retry/backoff + status transitions
- Scheduler addition: engagement-flow job that evaluates follow-up rules and enqueues WhatsApp sends

## 5) UI Additions/Tabs/Components
New sidebar item: `Prospects` with subviews:
- `Prospects List`: table with phone, consent, source, score, last engagement, quick manual message button
- `Add Prospect`: inline form for phone, name, email, source, consent checkbox
- `Templates`: manage template library with variable tokens, preview
- `Send Center`: choose audience segment/template, preview personalized output, manual send button

Existing updates:
- `accounts` tab: add WhatsApp connection config store surface
- `dashboard`: add WhatsApp engagement metric cards sent/read/replied/opt-outs from `WhatsAppEngagement`
- `create` tab: allow selecting WhatsApp for campaign but separate from social posting to avoid mixing channel types

## 6) Engagement Flows
Auto-welcome:
- Trigger: prospect created with `consentWhatsapp=true`
- Action: send welcome template referencing `{{productName}}` + `{{primaryPain}}` from linked business profile context or UTM-landing context
- Delay: immediate or configurable delay slot within first 24h

Follow-up:
- Sequence by score bands or source: e.g. high score -> demo offer; medium -> content nurture; low -> winback/drip
- Config template + delay pairs; retry on bounded failures; stop when `optOutAt` is set
- Continue tracking reply state > pause/resume dependent on status

Manual outreach:
- One-off send from prospect detail row; inline message composer with template insertion and preview

## 7) Auth/Tenant/CORS/Env Gaps
- Auth covers already-JWT + manual auth headers; do not change auth beyond tenant scoping in new endpoints
- No role system for engagement management; if needed, enforce existing `EDITOR`/`ADMIN` string role before send
- Env vars for approval-aware sends: `WHATSAPP_TEMPLATE_NAMESPACE`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`
- Backend URL env already used; align `/api` prefix with existing `API_URL`

## 8) Reusability Signals
- Keep `WhatsAppTemplate` generic enough to drive both inbound capture response templates and outbound nurture
- Make engagement entity reusable for future SMS/telegram channels by adding channel column in V2
- Use existing brand voice/offer/pain/gain fields from `BusinessProfile` as message context so messages match current campaign voice
- Reuse `Post.platform === 'whatsapp'` distinction only for broadcast social posts; separate new entity for CRM sends

## 9) Risks/Runbook/Review Checklist
- Phone normalization failures block sends; add validation in UI + server
- Opt-out compliance: prevent sending to opted-out leads
- MCP unavailability: fallback to mock and surface status
- Rate limits: add per-tenant throttling config
- Reputation: store message content history in `WhatsAppEngagement` for audit

## 10) Suggested Execution Order
1) schema + db helpers
2) template CRUD endpoints
3) prospect list/create/edit endpoints
4) `/api/whatsapp/send`, `/send-batch`
5) UI list + add prospect + send modal
6) welcome automation hook in prospect create
7) follow-up scheduler rule engine
8) webhook/reply tracking + mark read
9) dashboard metrics + review
