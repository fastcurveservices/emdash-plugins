# FastCurve EmDash Plugins

Marketplace-ready [EmDash CMS](https://docs.emdashcms.com/) plugins for [emdashcms.org](https://emdashcms.org/docs/contributors).

## Plugins

| Plugin | ID | `manifest.json` |
| ------ | -- | --------------- |
| [fastcurve-form-email](./fastcurve-form-email/) | `fastcurve-form-email` | [manifest.json](./fastcurve-form-email/manifest.json) |
| [fastcurve-audit-log](./fastcurve-audit-log/) | `fastcurve-audit-log` | [manifest.json](./fastcurve-audit-log/manifest.json) |
| [fastcurve-visitor-tracker](./fastcurve-visitor-tracker/) | `fastcurve-visitor-tracker` | [manifest.json](./fastcurve-visitor-tracker/manifest.json) |

Each plugin includes a root **`manifest.json`**. After `npm run bundle`, `postbundle` maps capabilities to the emdashcms.org schema (`read:content`) and syncs the tarball manifest.

If publish fails with **403 Forbidden** and the plugin id is already registered, your `EMDASH_MARKETPLACE_TOKEN` must belong to the GitHub account that owns that plugin id. Sign in at [emdashcms.org/dashboard](https://emdashcms.org/dashboard), confirm ownership, re-run `emdash plugin login`, and update the GitHub secret — or choose a new plugin id.

## Local development

```bash
npm install
cd fastcurve-form-email
npm run validate    # build + bundle validation
npm run bundle      # creates dist/*.tar.gz + syncs manifest.json
```

## One-time login (local publish)

Authenticate with GitHub device flow (token cached ~30 days in `~/.config/emdash/auth.json`):

```bash
npm run login
# or
npx emdash plugin login --registry https://emdashcms.org
```

## Publish to emdashcms.org

### Option A — CLI (manual)

```bash
cd fastcurve-form-email
npm run bundle
npm run publish:marketplace
```

### Option B — GitHub Release (GitHub App auto-submit)

1. Register each plugin ID at [emdashcms.org/dashboard](https://emdashcms.org/dashboard).
2. Install the emdashcms.org GitHub App on this repo and link each plugin.
3. Create a release with tag `fastcurve-form-email-v1.0.0` (must match `manifest.json` version).
4. The workflow bundles and attaches the `.tgz`; emdashcms.org scans and publishes automatically.

**CLI publish is off by default in GitHub Actions.** Release events only build and attach the bundle.

### Option C — GitHub Actions manual publish

1. Sign in at [emdashcms.org/dashboard](https://emdashcms.org/dashboard) with GitHub (required before first publish).
2. Add repository secret **`EMDASH_MARKETPLACE_TOKEN`** (marketplace JWT from a one-time local login):
   ```bash
   npx emdash plugin login --registry https://emdashcms.org
   node -e "const s=require(process.env.HOME+'/.config/emdash/auth.json'); console.log(s['marketplace:https://emdashcms.org'].token)"
   ```
3. Run **Actions → Publish EmDash Plugins → Run workflow**.
4. Choose **all** (default parallel) or a single plugin directory.
5. Leave **Publish to emdashcms.org** unchecked to bundle only (default).
6. Enable **Publish to emdashcms.org** to upload via CLI.
7. With publish enabled, **Bump patch version after publish** (default on) bumps the unified `pluginVersion` in root `package.json` and syncs every plugin’s `package.json`, `src/index.ts`, and `manifest.json` (e.g. `1.0.0` → `1.0.1`).

CI stores the token in the CLI auth file, registers the plugin with a description (if needed), then uploads the tarball via `scripts/publish-marketplace.mjs` — bypassing the emdash CLI register path that omits description.

### Option D — Auto publish on merge to `main`

Every push to **`main`** (except `[skip ci]` bump commits) runs **all three plugins in parallel**:

1. **`prepare`** — reads unified `pluginVersion` from root `package.json`, runs `scripts/sync-plugin-versions.mjs`, and shares the synced workspace.
2. **`bundle-and-publish`** — matrix job (one job per plugin): validate, bundle, publish to emdashcms.org.
3. **`bump-all`** — on full success, runs `scripts/bump-all-versions.mjs patch`, commits, and pushes the next version with `[skip ci]` so versions stay in sync across the monorepo.

Requires **`EMDASH_MARKETPLACE_TOKEN`** on the repo. Release tags (`<plugin>-v<semver>`) still only build and attach bundles (no CLI publish).

## Environment variables (site install)

| Variable | Used by | Purpose |
| -------- | ------- | ------- |
| `FORM_NOTIFY_TO` | form-email, audit-log | Notification recipient |
| `SITE_NAME` | form-email, audit-log | Email template site name |
| `SITE_SHORT` | form-email, audit-log | Email subject prefix |

## CI secrets

| Secret | Required when | Purpose |
| ------ | ------------- | ------- |
| `EMDASH_MARKETPLACE_TOKEN` | `publish_to_registry=true` | CLI auth for `emdash plugin publish` |

## Marketplace listing metadata

Each plugin `package.json` can declare listing fields synced to emdashcms.org on every publish via `scripts/ensure-plugin-registered.mjs`:

| Field | Source |
| ----- | ------ |
| Category | `marketplace.category` |
| Repository URL | `marketplace.repositoryUrl` or `repository.url` |
| Homepage URL | `marketplace.homepageUrl`, `homepage`, or repo `directory` link |
| Support URL | `marketplace.supportUrl` |
| Funding URL | `marketplace.fundingUrl` (optional) |
| Keywords | `marketplace.keywords` or `keywords` |
| License | `marketplace.license` or `license` |
| Short description | `shortDescription` |

Example:

```json
{
  "shortDescription": "One-line catalog summary.",
  "keywords": ["emdash", "analytics"],
  "marketplace": {
    "name": "My Plugin",
    "category": "analytics",
    "supportUrl": "https://github.com/org/repo/issues"
  }
}
```

MIT — see [LICENSE](./LICENSE).
