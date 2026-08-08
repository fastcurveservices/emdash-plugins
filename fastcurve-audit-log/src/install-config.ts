import type { PluginContext } from "emdash";

export const NOTIFY_TO_KV_KEY = "formNotifyTo";

function readEnv(name: string): string | undefined {
	const value = process.env[name]?.trim();
	return value || undefined;
}

/** Cache site env config once at install so runtime handlers avoid repeated env reads. */
export async function cacheInstallConfig(ctx: PluginContext): Promise<void> {
	const notifyTo = readEnv("FORM_NOTIFY_TO") ?? readEnv("SMTP_TO");
	if (notifyTo) {
		await ctx.kv.set(NOTIFY_TO_KV_KEY, notifyTo);
	}
}
