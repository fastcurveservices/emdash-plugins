#!/usr/bin/env node
/**
 * Copy manifest.json from the latest plugin tarball into the plugin directory.
 *
 * Usage: node scripts/sync-manifest.mjs <plugin-dir>
 */
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { toMarketplaceManifest } from "./marketplace-manifest.mjs";

const pluginDir = resolve(process.argv[2] ?? ".");
const distDir = join(pluginDir, "dist");
const pkg = JSON.parse(readFileSync(join(pluginDir, "package.json"), "utf8"));
const version = pkg.version;

let tarball;
try {
	const candidates = readdirSync(distDir)
		.filter((name) => name.endsWith(".tar.gz") && name.includes(`-${version}.tar.gz`))
		.toSorted();
	tarball = candidates.at(-1);
} catch {
	console.error(`No dist/*.tar.gz found in ${pluginDir}. Run npm run bundle first.`);
	process.exit(1);
}

if (!tarball) {
	console.error(`No tarball matching version ${version} in ${distDir}`);
	process.exit(1);
}

const manifest = JSON.parse(
	execSync(`tar -xOf ${join(distDir, tarball)} manifest.json`, { encoding: "utf8" }),
);
const marketplace = toMarketplaceManifest(manifest);

writeFileSync(join(pluginDir, "manifest.json"), `${JSON.stringify(marketplace, null, 2)}\n`);
console.log(`Synced marketplace manifest.json from ${tarball}`);
