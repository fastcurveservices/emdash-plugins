import type { PluginContext } from "emdash";
import { NOTIFY_TO_KV_KEY } from "./install-config.js";

export async function resolveFormNotifyTo(ctx: PluginContext): Promise<string | undefined> {
	const cached = await ctx.kv.get(NOTIFY_TO_KV_KEY);
	if (typeof cached === "string" && cached.trim()) {
		return cached.trim();
	}
	return undefined;
}
