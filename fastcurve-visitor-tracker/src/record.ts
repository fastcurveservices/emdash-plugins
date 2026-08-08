import type { PluginContext } from "emdash";
import type { VisitInput, VisitorRecord } from "./types.js";

export const PLUGIN_ID = "fastcurve-visitor-tracker";

function makeHitId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isVisitorRecord(value: unknown): value is VisitorRecord {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const record = value as Record<string, unknown>;
	return (
		typeof record.visitorKey === "string" &&
		typeof record.firstSeen === "string" &&
		typeof record.lastSeen === "string" &&
		typeof record.visitCount === "number"
	);
}

export async function recordVisit(ctx: PluginContext, input: VisitInput): Promise<void> {
	const timestamp = new Date().toISOString();
	const prior = await ctx.storage.visitors.get(input.visitorKey);

	if (prior && isVisitorRecord(prior)) {
		await ctx.storage.visitors.put(input.visitorKey, {
			...prior,
			lastSeen: timestamp,
			visitCount: prior.visitCount + 1,
		});
	} else {
		await ctx.storage.visitors.put(input.visitorKey, {
			visitorKey: input.visitorKey,
			firstSeen: timestamp,
			lastSeen: timestamp,
			visitCount: 1,
		});
	}

	await ctx.storage.hits.put(makeHitId(), {
		timestamp,
		visitorKey: input.visitorKey,
		path: input.path,
		referer: input.referer,
	});
}
