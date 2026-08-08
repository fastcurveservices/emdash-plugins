#!/usr/bin/env node
/**
 * Publish a plugin tarball to emdashcms.org without the CLI register path.
 *
 * The emdash CLI re-registers on a public 404 and omits description. This script
 * registers via ensure-plugin-registered.mjs, then uploads the bundle directly.
 *
 * Usage: node scripts/publish-marketplace.mjs <plugin-dir> [tarball-path]
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { readMarketplaceCredential } from "./marketplace-auth.mjs";
import { checkPluginPublishAccess, explainPublishForbidden } from "./marketplace-access.mjs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const registryUrl = process.env.EMDASH_REGISTRY ?? "https://emdashcms.org";
const pluginDir = resolve(process.argv[2] ?? ".");
const manifest = JSON.parse(readFileSync(join(pluginDir, "manifest.json"), "utf8"));
const pkg = JSON.parse(readFileSync(join(pluginDir, "package.json"), "utf8"));

const tarballPath = resolve(
	process.argv[3] ??
		join(
			pluginDir,
			"dist",
			readdirSync(join(pluginDir, "dist"))
				.filter((name) => name.endsWith(".tar.gz") && name.includes(`-${pkg.version}.tar.gz`))
				.toSorted()
				.at(-1) ?? "",
		),
);

if (!tarballPath.endsWith(".tar.gz")) {
	console.error(`No tarball for version ${pkg.version} in ${join(pluginDir, "dist")}`);
	process.exit(1);
}

execFileSync(process.execPath, [join(scriptsDir, "ensure-plugin-registered.mjs"), pluginDir], {
	stdio: "inherit",
	env: process.env,
});

const registryOrigin = new URL(registryUrl).origin;
const { token } = readMarketplaceCredential(registryUrl);
const access = await checkPluginPublishAccess(registryUrl, token, manifest.id);
if (access !== "owner") {
	console.error(await explainPublishForbidden(registryUrl, token, manifest.id));
	process.exit(1);
}

const tarballData = readFileSync(tarballPath);
const formData = new FormData();
formData.append(
	"bundle",
	new Blob([tarballData], { type: "application/gzip" }),
	basename(tarballPath),
);

console.log(`Publishing ${manifest.id}@${manifest.version}...`);
console.log(`Tarball: ${tarballPath} (${(tarballData.length / 1024).toFixed(1)}KB)`);

const uploadRes = await fetch(new URL(`/api/v1/plugins/${manifest.id}/versions`, registryUrl), {
	method: "POST",
	headers: {
		Authorization: `Bearer ${token}`,
		Origin: registryOrigin,
	},
	body: formData,
});

if (!uploadRes.ok && uploadRes.status !== 202) {
	const body = await uploadRes.json().catch(() => ({}));
	const message = typeof body === "object" && body && "error" in body ? body.error : uploadRes.statusText;

	if (uploadRes.status === 409 && typeof body === "object" && body && "latestVersion" in body) {
		console.error(`Version ${manifest.version} must be greater than ${body.latestVersion}`);
	} else if (uploadRes.status === 422 && typeof body === "object" && body && "audit" in body) {
		console.error("Plugin failed security audit:");
		console.error(`  Verdict: ${body.audit?.verdict ?? "fail"}`);
		console.error(`  Summary: ${body.audit?.summary ?? message}`);
	} else if (uploadRes.status === 403) {
		console.error(`Publish failed: ${message}`);
		if (
			typeof message === "string" &&
			message.toLowerCase().includes("not authorized to upload versions")
		) {
			console.error(await explainPublishForbidden(registryUrl, token, manifest.id));
		}
	} else {
		console.error(`Publish failed: ${message}`);
	}
	process.exit(1);
}

const result = await uploadRes.json().catch(() => ({}));
console.log(`Uploaded ${manifest.id}@${result.version ?? manifest.version}`);
if (result.checksum) console.log(`Checksum: ${result.checksum}`);
if (uploadRes.status === 202) {
	console.log("Status: pending (audit running in background, --no-wait)");
}
