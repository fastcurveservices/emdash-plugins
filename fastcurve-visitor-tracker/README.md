# @fastcurve/visitor-tracker

EmDash plugin for anonymous visitor and page-view tracking with admin dashboards.

## Privacy

The plugin stores only:

- A site-computed **visitor key** (hash of IP + User-Agent, computed outside the plugin)
- Page path and timestamps

Raw IP addresses, User-Agent strings, and referer URLs are **not** persisted in plugin storage.

## Site integration

Your site middleware should hash IP and User-Agent into `visitorKey` before calling the `record-visit` route. Only send `visitorKey` and `path` in the payload.

## Publish

```bash
npm run validate
npm run bundle
npm run publish:marketplace
```

MIT © FastCurve Services
