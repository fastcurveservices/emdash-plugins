#!/usr/bin/env node
/**
 * Bump patch semver in package.json, src/index.ts, and manifest.json.
 *
 * Usage: node scripts/bump-version.mjs <plugin-dir> [major|minor|patch]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const pluginDir = resolve(process.argv[2] ?? ".");
const part = process.argv[3] ?? "patch";

const pkgPath = join(pluginDir, "package.json");
const indexPath = join(pluginDir, "src", "index.ts");
const manifestPath = join(pluginDir, "manifest.json");

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const current = pkg.version;
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
if (!match) {
	console.error(`Invalid semver in ${pkgPath}: ${current}`);
	process.exit(1);
}

let [major, minor, patch] = match.slice(1).map(Number);
if (part === "major") {
	major += 1;
	minor = 0;
	patch = 0;
} else if (part === "minor") {
	minor += 1;
	patch = 0;
} else if (part === "patch") {
	patch += 1;
} else {
	console.error(`Unknown bump part: ${part}`);
	process.exit(1);
}

const next = `${major}.${minor}.${patch}`;

pkg.version = next;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, "\t")}\n`);

let indexSource = readFileSync(indexPath, "utf8");
indexSource = indexSource.replace(/version:\s*"[^"]+"/, `version: "${next}"`);
writeFileSync(indexPath, indexSource);

try {
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	manifest.version = next;
	writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
} catch {
	// manifest.json may not exist yet
}

console.log(`${current} -> ${next}`);
