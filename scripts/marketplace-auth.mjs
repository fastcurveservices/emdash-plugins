import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * @param {string} registryUrl
 * @returns {{ token: string; expiresAt?: string }}
 */
export function readMarketplaceCredential(registryUrl) {
	const configDir =
		process.env.XDG_CONFIG_HOME != null
			? join(process.env.XDG_CONFIG_HOME, "emdash")
			: join(homedir(), ".config", "emdash");
	const authPath = join(configDir, "auth.json");
	const authKey = `marketplace:${new URL(registryUrl).origin}`;

	/** @type {Record<string, { token?: string; expiresAt?: string }>} */
	let store = {};
	try {
		store = JSON.parse(readFileSync(authPath, "utf8"));
	} catch {
		throw new Error("Marketplace auth not found. Run prepare-marketplace-auth or emdash plugin login first.");
	}

	const credential = store[authKey];
	if (!credential?.token) {
		throw new Error("Marketplace token missing from auth file.");
	}
	if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
		throw new Error("Marketplace token expired. Re-run emdash plugin login and refresh the secret.");
	}

	return { token: credential.token, expiresAt: credential.expiresAt };
}
