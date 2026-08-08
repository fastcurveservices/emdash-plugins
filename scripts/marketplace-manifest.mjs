/**
 * Transform an EmDash CLI manifest for emdashcms.org publishing.
 *
 * Tarball manifests use marketplace capability names (`read:content`) for upload validation.
 * Plugin registration uses the same mapping via `toMarketplaceCapabilities()`.
 * @see https://emdashcms.org/docs/contributors
 */

/** @type {Record<string, string | null>} */
export const CAPABILITY_TO_MARKETPLACE = {
	"content:read": "read:content",
	"content:write": "write:content",
	"media:read": "read:media",
	"media:write": "write:media",
	"users:read": "read:users",
	"email:send": "email:send",
	"network:request": "network:fetch",
	"network:request:unrestricted": "network:fetch:any",
	"hooks.email-transport:register": "email:provide",
	"hooks.email-events:register": null,
	"hooks.page-fragments:register": "page:inject",
	"network:fetch": "network:fetch",
	"network:fetch:any": "network:fetch:any",
	"read:content": "read:content",
	"write:content": "write:content",
	"read:media": "read:media",
	"write:media": "write:media",
	"read:users": "read:users",
	"email:provide": "email:provide",
	"email:intercept": "email:intercept",
	"page:inject": "page:inject",
};

/**
 * @param {unknown[]} capabilities
 * @returns {string[]}
 */
export function toMarketplaceCapabilities(capabilities) {
	const mapped = [];
	for (const cap of capabilities ?? []) {
		if (typeof cap !== "string") continue;
		const marketplace = CAPABILITY_TO_MARKETPLACE[cap];
		if (marketplace && !mapped.includes(marketplace)) mapped.push(marketplace);
	}
	return mapped;
}

export const MARKETPLACE_HOOKS = new Set([
	"plugin:install",
	"plugin:activate",
	"plugin:deactivate",
	"plugin:uninstall",
	"content:beforeSave",
	"content:afterSave",
	"content:beforeDelete",
	"content:afterDelete",
	"media:beforeUpload",
	"media:afterUpload",
	"cron",
	"email:beforeSend",
	"email:deliver",
	"email:afterSend",
	"comment:beforeCreate",
	"comment:moderate",
	"comment:afterCreate",
	"comment:afterModerate",
	"page:metadata",
	"page:fragments",
]);

/**
 * @param {unknown} hook
 * @returns {string | null}
 */
export function hookName(hook) {
	if (typeof hook === "string") return hook;
	if (hook && typeof hook === "object" && typeof hook.name === "string") return hook.name;
	return null;
}

/**
 * @param {Record<string, unknown>} manifest
 * @returns {Record<string, unknown>}
 */
export function toMarketplaceManifest(manifest) {
	const capabilities = toMarketplaceCapabilities(manifest.capabilities);

	const hooks = [];
	for (const hook of manifest.hooks ?? []) {
		const name = hookName(hook);
		if (name && MARKETPLACE_HOOKS.has(name) && !hooks.includes(name)) hooks.push(name);
	}

	return {
		id: manifest.id,
		version: manifest.version,
		capabilities,
		allowedHosts: manifest.allowedHosts ?? [],
		hooks,
		routes: manifest.routes ?? [],
		storage: manifest.storage ?? {},
		admin: manifest.admin ?? {},
	};
}
