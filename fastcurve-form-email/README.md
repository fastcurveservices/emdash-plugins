# @fastcurve/form-email

EmDash plugin that sends email notifications when contact form submissions are saved.

## Configuration

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `FORM_NOTIFY_TO` | Yes | Notification recipient email |
| `SITE_NAME` | No | Site name in templates (default: "Your Site Name") |
| `SITE_SHORT` | No | Short name in subjects (default: "Site") |

## Publish

```bash
npm run validate
npm run bundle
npx emdash plugin publish --registry https://emdashcms.org
```

MIT © FastCurve Services
