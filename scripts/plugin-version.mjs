import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { PLUGINS } from "./plugins.mjs";

const rootDir = resolve(import.meta.dirname, "..");
const rootPkgPath = join(rootDir, "package.json");

export function readRootPackage() {
	return JSON.parse(readFileSync(rootPkgPath, "utf8"));
}

export function writeRootPackage(pkg) {
	writeFileSync(rootPkgPath, `${JSON.stringify(pkg, null, "\t")}\n`);
}

/** @returns {string} */
export function readUnifiedVersion() {
	const root = readRootPackage();
	if (typeof root.pluginVersion === "string" && root.pluginVersion) {
		return root.pluginVersion;
	}

	let max = "0.0.0";
	for (const plugin of PLUGINS) {
		const pkg = JSON.parse(readFileSync(join(rootDir, plugin, "package.json"), "utf8"));
		if (compareSemver(pkg.version, max) > 0) max = pkg.version;
	}
	return max;
}

/** @param {string} version */
export function writeUnifiedVersion(version) {
	const root = readRootPackage();
	root.pluginVersion = version;
	writeRootPackage(root);
}

/** @param {string} a @param {string} b @returns {number} */
function compareSemver(a, b) {
	const parse = (v) => {
		const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
		if (!m) throw new Error(`Invalid semver: ${v}`);
		return m.slice(1).map(Number);
	};
	const [aMaj, aMin, aPat] = parse(a);
	const [bMaj, bMin, bPat] = parse(b);
	if (aMaj !== bMaj) return aMaj - bMaj;
	if (aMin !== bMin) return aMin - bMin;
	return aPat - bPat;
}

/** @param {string} version @param {string} pluginDir */
export function applyVersionToPlugin(pluginDir, version) {
	const dir = resolve(pluginDir);
	const pkgPath = join(dir, "package.json");
	const indexPath = join(dir, "src", "index.ts");
	const manifestPath = join(dir, "manifest.json");

	const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
	pkg.version = version;
	writeFileSync(pkgPath, `${JSON.stringify(pkg, null, "\t")}\n`);

	let indexSource = readFileSync(indexPath, "utf8");
	indexSource = indexSource.replace(/version:\s*"[^"]+"/, `version: "${version}"`);
	writeFileSync(indexPath, indexSource);

	try {
		const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
		manifest.version = version;
		writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
	} catch {
		// manifest may be generated on bundle
	}
}

/** @param {string} version */
export function applyVersionToAllPlugins(version) {
	for (const plugin of PLUGINS) {
		applyVersionToPlugin(join(rootDir, plugin), version);
	}
}

/** @param {"major"|"minor"|"patch"} part */
export function bumpUnifiedVersion(part) {
	const current = readUnifiedVersion();
	const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
	if (!match) throw new Error(`Invalid unified semver: ${current}`);

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
		throw new Error(`Unknown bump part: ${part}`);
	}

	const next = `${major}.${minor}.${patch}`;
	writeUnifiedVersion(next);
	applyVersionToAllPlugins(next);
	return { current, next };
}
