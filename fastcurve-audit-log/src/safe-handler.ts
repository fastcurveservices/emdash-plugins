import type { PluginContext } from "emdash";

export function withHookErrorHandling<E>(
	handler: (event: E, ctx: PluginContext) => Promise<void | unknown>,
): (event: E, ctx: PluginContext) => Promise<void | unknown> {
	return async (event, ctx) => {
		try {
			return await handler(event, ctx);
		} catch (error) {
			ctx.log.error("Hook handler failed", {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	};
}

export function withRouteErrorHandling<T>(
	handler: (input: unknown, ctx: PluginContext) => Promise<T>,
): (input: unknown, ctx: PluginContext) => Promise<T | { success: false; error: string }> {
	return async (input, ctx) => {
		try {
			return await handler(input, ctx);
		} catch (error) {
			ctx.log.error("Route handler failed", {
				error: error instanceof Error ? error.message : String(error),
			});
			return { success: false, error: "Internal plugin error" };
		}
	};
}
