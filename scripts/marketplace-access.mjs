/**
 * Check whether the authenticated marketplace user can publish to a plugin.
 */

/**
 * @param {string} token
 * @returns {string | null}
 */
export function decodeMarketplaceUsername(token) {
	try {
		const payload = token.split(".")[1];
		if (!payload) return null;
		const json = Buffer.from(payload, "base64url").toString("utf8");
		const data = JSON.parse(json);
		return typeof data.username === "string" ? data.username : null;
	} catch {
		return null;
	}
}

/**
 * Uses the dashboard successor-candidates endpoint as a maintainer access probe.
 *
 * @param {string} registryUrl
 * @param {string} token
 * @param {string} pluginId
 * @returns {Promise<"owner" | "not_registered" | "forbidden" | "unauthorized">}
 */
export async function checkPluginPublishAccess(registryUrl, token, pluginId) {
	const res = await fetch(
		new URL(`/api/v1/dashboard/plugins/${pluginId}/successor-candidates?q=`, registryUrl),
		{ headers: { Authorization: `Bearer ${token}` } },
	);

	if (res.status === 200) return "owner";
	if (res.status === 404) return "not_registered";
	if (res.status === 403) return "forbidden";
	if (res.status === 401) return "unauthorized";
	return "forbidden";
}

/**
 * @param {string} registryUrl
 * @param {string} pluginId
 * @returns {Promise<string | null>}
 */
export async function fetchPublicPluginOwner(registryUrl, pluginId) {
	const res = await fetch(new URL(`/api/v1/plugins/${pluginId}`, registryUrl));
	if (!res.ok) return null;
	const body = await res.json().catch(() => null);
	if (!body || typeof body !== "object" || !("author" in body)) return null;
	const author = body.author;
	if (!author || typeof author !== "object" || !("name" in author)) return null;
	return typeof author.name === "string" ? author.name : null;
}

/**
 * @param {string} registryUrl
 * @param {string} token
 * @param {string} pluginId
 */
export async function explainPublishForbidden(registryUrl, token, pluginId) {
	const signedInAs = decodeMarketplaceUsername(token);
	const owner = await fetchPublicPluginOwner(registryUrl, pluginId);
	const lines = [
		`Cannot publish ${pluginId} with the current marketplace token.`,
	];

	if (signedInAs) {
		lines.push(`Signed in as GitHub user: ${signedInAs}`);
	}
	if (owner) {
		lines.push(`Plugin owner on emdashcms.org: ${owner}`);
	} else {
		lines.push(
			"The plugin id is already registered, but it has no public listing yet (no published version).",
		);
	}

	lines.push(
		"Use the same GitHub account that registered the plugin, or register a new plugin id at https://emdashcms.org/dashboard.",
	);
	lines.push(
		"Then refresh EMDASH_MARKETPLACE_TOKEN: npx emdash plugin login --registry https://emdashcms.org",
	);

	return lines.join("\n");
}
