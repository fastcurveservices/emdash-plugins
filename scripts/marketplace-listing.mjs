/**
 * Build emdashcms.org listing metadata from package.json.
 *
 * Supports optional `marketplace` block plus standard npm fields (`repository`,
 * `keywords`, `license`, `homepage`, `description`, `shortDescription`).
 */

const GITHUB_TREE_MAIN = "/tree/main/";

/** @param {unknown} repo */
function resolveRepositoryUrl(repo) {
	if (!repo) return undefined;
	if (typeof repo === "string") {
		return normalizeGitUrl(repo);
	}
	if (typeof repo === "object" && repo && "url" in repo && typeof repo.url === "string") {
		return normalizeGitUrl(repo.url);
	}
	return undefined;
}

/** @param {string} url */
function normalizeGitUrl(url) {
	return url
		.trim()
		.replace(/^git\+/, "")
		.replace(/\.git$/i, "")
		.replace(/^git@github.com:/i, "https://github.com/");
}

/** @param {Record<string, unknown>} pkg */
function repositoryDirectoryUrl(pkg) {
	const base = resolveRepositoryUrl(pkg.repository);
	if (!base) return undefined;

	const directory =
		pkg.repository &&
		typeof pkg.repository === "object" &&
		!Array.isArray(pkg.repository) &&
		typeof pkg.repository.directory === "string"
			? pkg.repository.directory
			: undefined;

	if (directory) {
		return `${base}${GITHUB_TREE_MAIN}${directory}`;
	}
	return base;
}

/** @param {string | undefined} value @param {number} max */
function truncate(value, max) {
	if (!value) return undefined;
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	return trimmed.length > max ? `${trimmed.slice(0, max - 3)}...` : trimmed;
}

/** @param {unknown} value */
function stringOrUndefined(value) {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** @param {unknown} value */
function keywordsArray(value) {
	if (!Array.isArray(value)) return undefined;
	const keywords = value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
	return keywords.length > 0 ? keywords : undefined;
}

/**
 * @param {Record<string, unknown>} pkg
 * @param {{ id?: string }} manifest
 * @returns {Record<string, unknown>}
 */
export function buildListingMetadata(pkg, manifest) {
	const marketplace =
		pkg.marketplace && typeof pkg.marketplace === "object" && !Array.isArray(pkg.marketplace)
			? /** @type {Record<string, unknown>} */ (pkg.marketplace)
			: {};

	const repositoryUrl =
		stringOrUndefined(marketplace.repositoryUrl) ?? resolveRepositoryUrl(pkg.repository);
	const homepageUrl =
		stringOrUndefined(marketplace.homepageUrl) ??
		stringOrUndefined(pkg.homepage) ??
		repositoryDirectoryUrl(pkg);

	const metadata = {
		name: stringOrUndefined(marketplace.name) ?? stringOrUndefined(manifest.id) ?? stringOrUndefined(pkg.name),
		description: truncate(stringOrUndefined(pkg.description), 4000),
		shortDescription: truncate(stringOrUndefined(pkg.shortDescription ?? pkg.description), 160),
		category: stringOrUndefined(marketplace.category),
		repositoryUrl,
		homepageUrl,
		supportUrl: stringOrUndefined(marketplace.supportUrl),
		fundingUrl: stringOrUndefined(marketplace.fundingUrl),
		keywords: keywordsArray(marketplace.keywords) ?? keywordsArray(pkg.keywords),
		license: stringOrUndefined(marketplace.license) ?? stringOrUndefined(pkg.license),
	};

	return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null));
}

/**
 * @param {Record<string, unknown>} metadata
 * @param {{ id: string }} manifest
 * @param {string[]} capabilities
 */
export function toCreateListingPayload(metadata, manifest, capabilities) {
	return Object.fromEntries(
		Object.entries({
			id: manifest.id,
			name: metadata.name ?? manifest.id,
			description: metadata.description,
			short_description: metadata.shortDescription,
			capabilities,
			category: metadata.category,
			repository_url: metadata.repositoryUrl,
			homepage_url: metadata.homepageUrl,
			support_url: metadata.supportUrl,
			funding_url: metadata.fundingUrl,
			keywords: metadata.keywords,
			license: metadata.license,
		}).filter(([, value]) => value !== undefined && value !== null),
	);
}

/** @param {Record<string, unknown>} metadata */
export function toPatchListingPayload(metadata) {
	return {
		name: metadata.name,
		description: metadata.description,
		shortDescription: metadata.shortDescription,
		category: metadata.category ?? null,
		repositoryUrl: metadata.repositoryUrl ?? null,
		homepageUrl: metadata.homepageUrl ?? null,
		supportUrl: metadata.supportUrl ?? null,
		fundingUrl: metadata.fundingUrl ?? null,
		keywords: metadata.keywords ?? [],
		license: metadata.license ?? null,
	};
}
