import { ipKind } from "./is-ip.js";

function sourceParts(input: {
	actorIp?: string;
	actorIpv4?: string;
	actorIpv6?: string;
}): string[] {
	const parts: string[] = [];

	if (input.actorIpv4) {
		parts.push(`4:${input.actorIpv4}`);
	} else if (input.actorIp && ipKind(input.actorIp) === 4) {
		parts.push(`4:${input.actorIp}`);
	}

	if (input.actorIpv6) {
		parts.push(`6:${input.actorIpv6}`);
	} else if (input.actorIp && ipKind(input.actorIp) === 6) {
		parts.push(`6:${input.actorIp}`);
	}

	return parts;
}

/** Hash client network identifiers before persistence or email display. */
export async function fingerprintAuthSource(input: {
	actorIp?: string;
	actorIpv4?: string;
	actorIpv6?: string;
}): Promise<string | undefined> {
	const parts = sourceParts(input);
	if (parts.length === 0) return undefined;

	const data = new TextEncoder().encode(parts.join("|"));
	const digest = await crypto.subtle.digest("SHA-256", data);
	const hex = [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
	return hex.slice(0, 16);
}

export function formatSourceKey(key?: string): string {
	return key?.trim() || "—";
}
