# @fastcurve/visitor-tracker

EmDash plugin for anonymous visitor and page-view tracking with admin dashboards.

## Privacy

The plugin stores only:

- A site-computed **visitor key** (hash of IP + User-Agent, computed outside the plugin)
- Page path, optional referer, and timestamps

Raw IP addresses and User-Agent strings are **not** persisted in plugin storage.

## Site integration

Your site middleware should hash IP and User-Agent into `visitorKey` before calling the `record-visit` route. See the BSBB site `visit-tracker.ts` for a reference pattern.

## Publish

```bash
npm run validate
npm run bundle
npm run publish:marketplace
```

MIT © FastCurve Services
