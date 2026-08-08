#!/usr/bin/env node
/**
 * Store EMDASH_MARKETPLACE_TOKEN in the CLI auth file instead of the env var.
 *
 * When the token is only in the environment, `emdash plugin publish` skips
 * first-time plugin registration and expects the server to auto-register on
 * upload — which returns 403 for regular marketplace JWTs. Writing the token
 * to ~/.config/emdash/auth.json lets the CLI register the plugin normally.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const registryUrl = process.env.EMDASH_REGISTRY ?? "https://emdashcms.org";
const token = process.env.EMDASH_MARKETPLACE_TOKEN?.trim();

if (!token) {
	console.error("EMDASH_MARKETPLACE_TOKEN is required.");
	process.exit(1);
}

const configDir =
	process.env.XDG_CONFIG_HOME != null
		? join(process.env.XDG_CONFIG_HOME, "emdash")
		: join(homedir(), ".config", "emdash");
const authPath = join(configDir, "auth.json");
const key = `marketplace:${new URL(registryUrl).origin}`;

mkdirSync(configDir, { recursive: true });

/** @type {Record<string, unknown>} */
let store = {};
try {
	store = JSON.parse(readFileSync(authPath, "utf8"));
} catch {
	// fresh auth file
}

store[key] = {
	token,
	expiresAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
};

writeFileSync(authPath, `${JSON.stringify(store, null, 2)}\n`);
console.log(`Stored marketplace credentials for ${registryUrl}`);
