#!/usr/bin/env node
/**
 * Register a plugin on emdashcms.org before first publish.
 *
 * Verifies the authenticated user owns the plugin id before skipping registration.
 * The public plugin catalog can list ids owned by other accounts — uploading then
 * fails with 403 Forbidden.
 *
 * Usage: node scripts/ensure-plugin-registered.mjs <plugin-dir>
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
	checkPluginPublishAccess,
	decodeMarketplaceUsername,
	explainPublishForbidden,
} from "./marketplace-access.mjs";
import { readMarketplaceCredential } from "./marketplace-auth.mjs";
import { toMarketplaceCapabilities } from "./marketplace-manifest.mjs";

const registryUrl = process.env.EMDASH_REGISTRY ?? "https://emdashcms.org";
const pluginDir = resolve(process.argv[2] ?? ".");
const pkg = JSON.parse(readFileSync(join(pluginDir, "package.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(pluginDir, "manifest.json"), "utf8"));

let token;
try {
	token = readMarketplaceCredential(registryUrl).token;
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}

const registryOrigin = new URL(registryUrl).origin;
const authHeaders = { Authorization: `Bearer ${token}`, Origin: registryOrigin };

function listingShortDescription() {
	const raw = (pkg.shortDescription ?? pkg.description)?.trim();
	if (!raw) return undefined;
	return raw.length > 160 ? `${raw.slice(0, 157)}...` : raw;
}

async function syncListingMetadata(pluginId) {
	const shortDescription = listingShortDescription();
	if (!shortDescription) return;

	const res = await fetch(new URL(`/api/v1/plugins/${pluginId}`, registryUrl), {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			...authHeaders,
		},
		body: JSON.stringify({ shortDescription }),
	});

	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		const message = typeof body === "object" && body && "error" in body ? body.error : res.statusText;
		console.warn(`Could not update listing short description: ${message}`);
	}
}

const access = await checkPluginPublishAccess(registryUrl, token, manifest.id);

if (access === "owner") {
	await syncListingMetadata(manifest.id);
	const user = decodeMarketplaceUsername(token);
	console.log(
		`Plugin ${manifest.id} is registered${user ? ` to @${user}` : ""} and ready to publish`,
	);
	process.exit(0);
}

if (access === "forbidden") {
	console.error(await explainPublishForbidden(registryUrl, token, manifest.id));
	process.exit(1);
}

if (access === "unauthorized") {
	console.error("Marketplace token was rejected. Re-login and refresh EMDASH_MARKETPLACE_TOKEN.");
	process.exit(1);
}

const description = pkg.description?.trim();
if (!description) {
	console.error(`package.json description is required to register ${manifest.id}`);
	process.exit(1);
}

const createRes = await fetch(new URL("/api/v1/plugins", registryUrl), {
	method: "POST",
	headers: {
		"Content-Type": "application/json",
		...authHeaders,
	},
	body: JSON.stringify({
		id: manifest.id,
		name: manifest.id,
		description,
		short_description: listingShortDescription(),
		capabilities: toMarketplaceCapabilities(manifest.capabilities),
	}),
});

if (createRes.status === 409) {
	console.error(await explainPublishForbidden(registryUrl, token, manifest.id));
	process.exit(1);
}

if (!createRes.ok) {
	const body = await createRes.json().catch(() => ({}));
	const message = typeof body === "object" && body && "error" in body ? body.error : createRes.statusText;
	console.error(`Failed to register plugin: ${message}`);
	process.exit(1);
}

console.log(`Registered plugin ${manifest.id}`);
