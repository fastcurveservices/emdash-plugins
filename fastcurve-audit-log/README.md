# @fastcurve/audit-log

EmDash plugin that records login activity and admin actions, with optional login email alerts.

## Privacy and permissions

- **Auth events:** client network identifiers are hashed to a short fingerprint before storage or email display; raw IP addresses are not kept.
- **User reads:** uses `users:read` only to resolve admin email/name when an event includes `actorId` but no email.
- **Email alerts:** set `FORM_NOTIFY_TO` (or `SMTP_TO`) in site env; the value is cached in plugin KV on install.
- **Site branding:** login emails use `ctx.site.name` — no `SITE_NAME` / `SITE_SHORT` env reads at send time.

## Publish

```bash
npm run validate
npm run bundle
npm run publish:marketplace
```

MIT © FastCurve Services
