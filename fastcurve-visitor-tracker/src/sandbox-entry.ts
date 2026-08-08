import type { PluginContext } from "emdash";
import type { SandboxedPlugin } from "emdash/plugin";
import { renderHitsPage, renderStatsWidget, renderVisitorsPage } from "./admin.js";
import { applyPageNav } from "./table-block.js";
import { recordVisit } from "./record.js";
import { withRouteErrorHandling } from "./safe-handler.js";
import type { VisitInput } from "./types.js";

interface BlockInteraction {
	type: string;
	page?: string;
	action_id?: string;
	value?: unknown;
}

function parseVisitInput(body: unknown): VisitInput | null {
	if (!body || typeof body !== "object" || Array.isArray(body)) return null;
	const input = body as Record<string, unknown>;
	if (typeof input.visitorKey !== "string" || typeof input.path !== "string") return null;

	return {
		visitorKey: input.visitorKey,
		path: input.path,
	};
}

export default {
	hooks: {
		"plugin:install": {
			handler: async (_event, ctx: PluginContext) => {
				ctx.log.info("FastCurve visitor tracker plugin installed");
			},
		},
	},

	routes: {
		"record-visit": {
			handler: withRouteErrorHandling(async (body, ctx: PluginContext) => {
				const input = parseVisitInput(body);
				if (!input) {
					return { success: false, error: "Invalid visit payload" };
				}

				await recordVisit(ctx, input);
				return { success: true };
			}),
		},

		admin: {
			handler: withRouteErrorHandling(async (body, ctx: PluginContext) => {
				const interaction = body as BlockInteraction;

				if (interaction.type === "page_load" && interaction.page === "/visitors") {
					return renderVisitorsPage(ctx);
				}
				if (interaction.type === "page_load" && interaction.page === "/hits") {
					return renderHitsPage(ctx);
				}
				if (interaction.type === "page_load" && interaction.page === "widget:visitor-stats") {
					return renderStatsWidget(ctx);
				}
				if (
					interaction.type === "block_action" &&
					(interaction.action_id === "visitors-page-prev" ||
						interaction.action_id === "visitors-page-next")
				) {
					const state = applyPageNav(interaction.value);
					if (state) return renderVisitorsPage(ctx, state);
				}
				if (
					interaction.type === "block_action" &&
					(interaction.action_id === "hits-page-prev" ||
						interaction.action_id === "hits-page-next")
				) {
					const state = applyPageNav(interaction.value);
					if (state) return renderHitsPage(ctx, state);
				}

				return { blocks: [] };
			}),
		},
	},
} satisfies SandboxedPlugin;
