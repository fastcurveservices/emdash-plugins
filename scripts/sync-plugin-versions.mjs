#!/usr/bin/env node
/**
 * Sync root pluginVersion to every plugin package.json, index.ts, and manifest.json.
 *
 * Usage: node scripts/sync-plugin-versions.mjs
 */
import {
	applyVersionToAllPlugins,
	readUnifiedVersion,
	writeUnifiedVersion,
} from "./plugin-version.mjs";

const version = readUnifiedVersion();
writeUnifiedVersion(version);
applyVersionToAllPlugins(version);
console.log(`Synced all plugins to v${version}`);
