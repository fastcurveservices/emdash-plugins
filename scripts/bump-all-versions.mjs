#!/usr/bin/env node
/**
 * Bump root pluginVersion and sync every plugin.
 *
 * Usage: node scripts/bump-all-versions.mjs [major|minor|patch]
 */
import { bumpUnifiedVersion } from "./plugin-version.mjs";

const part = process.argv[2] ?? "patch";
const { current, next } = bumpUnifiedVersion(part);
console.log(`${current} -> ${next}`);
