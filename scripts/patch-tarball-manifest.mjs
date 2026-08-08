#!/usr/bin/env node
/**
 * Rewrite manifest.json inside a plugin tarball to emdashcms.org marketplace schema.
 *
 * Usage: node scripts/patch-tarball-manifest.mjs <plugin-dir>
 */
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

import { toMarketplaceManifest } from "./marketplace-manifest.mjs";

const pluginDir = resolve(process.argv[2] ?? ".");
const distDir = join(pluginDir, "dist");
const pkg = JSON.parse(readFileSync(join(pluginDir, "package.json"), "utf8"));

const tarball = readdirSync(distDir)
	.filter((name) => name.endsWith(".tar.gz") && name.includes(`-${pkg.version}.tar.gz`))
	.toSorted()
	.at(-1);

if (!tarball) {
	console.error(`No tarball for version ${pkg.version} in ${distDir}`);
	process.exit(1);
}

const tarballPath = join(distDir, tarball);
const tempDir = mkdtempSync(join(tmpdir(), "emdash-plugin-"));

try {
	execSync(`tar -xzf ${tarballPath} -C ${tempDir}`, { stdio: "pipe" });
	const manifestPath = join(tempDir, "manifest.json");
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	const marketplace = toMarketplaceManifest(manifest);
	writeFileSync(manifestPath, `${JSON.stringify(marketplace, null, 2)}\n`);
	const files = readdirSync(tempDir).filter((name) => name !== "." && name !== "..");
	execSync(`tar -czf ${JSON.stringify(tarballPath)} ${files.map((f) => JSON.stringify(f)).join(" ")}`, {
		cwd: tempDir,
		stdio: "pipe",
	});
	writeFileSync(join(pluginDir, "manifest.json"), `${JSON.stringify(marketplace, null, 2)}\n`);
	console.log(`Patched ${tarball} for emdashcms.org`);
} finally {
	rmSync(tempDir, { recursive: true, force: true });
}
