import type { PluginContext } from "emdash";
import type { SandboxedPlugin } from "emdash/plugin";
import { renderActionsPage, renderLoginPage, renderRecentWidget } from "./admin.js";
import { applyPageNav } from "./table-block.js";
import {
	onCommentAfterCreate,
	onCommentAfterModerate,
	onContentAfterDelete,
	onContentAfterSave,
	onContentBeforeSave,
	onEmailAfterSend,
	onMediaAfterUpload,
	onPluginLifecycle,
} from "./hooks.js";
import { PLUGIN_ID, recordAuthEvent } from "./record.js";
import type { AuthAuditInput } from "./types.js";

interface BlockInteraction {
	type: string;
	page?: string;
	action_id?: string;
	value?: unknown;
}

function parseAuthInput(body: unknown): AuthAuditInput | null {
	if (!body || typeof body !== "object" || Array.isArray(body)) return null;
	const input = body as Record<string, unknown>;
	if (typeof input.action !== "string" || typeof input.path !== "string") return null;

	const status = input.status;
	if (status !== "success" && status !== "failure" && status !== "denied") return null;

	return {
		action:
			input.action === "login" ||
			input.action === "logout" ||
			input.action === "login_failed"
				? input.action
				: "login",
		status,
		path: input.path,
		actorId: typeof input.actorId === "string" ? input.actorId : undefined,
		actorEmail: typeof input.actorEmail === "string" ? input.actorEmail : undefined,
		actorName: typeof input.actorName === "string" ? input.actorName : undefined,
		actorIp: typeof input.actorIp === "string" ? input.actorIp : undefined,
		actorIpv4: typeof input.actorIpv4 === "string" ? input.actorIpv4 : undefined,
		actorIpv6: typeof input.actorIpv6 === "string" ? input.actorIpv6 : undefined,
		details:
			input.details && typeof input.details === "object" && !Array.isArray(input.details)
				? (input.details as Record<string, unknown>)
				: undefined,
	};
}

export default {
	hooks: {
		"plugin:install": {
			handler: async (_event, ctx) => {
				await onPluginLifecycle(ctx, "install", PLUGIN_ID);
				ctx.log.info("FastCurve audit log plugin installed");
			},
		},
		"plugin:activate": {
			handler: async (_event, ctx) => {
				await onPluginLifecycle(ctx, "activate", PLUGIN_ID);
			},
		},
		"plugin:deactivate": {
			handler: async (_event, ctx) => {
				await onPluginLifecycle(ctx, "deactivate", PLUGIN_ID);
			},
		},
		"plugin:uninstall": {
			handler: async (_event, ctx) => {
				await onPluginLifecycle(ctx, "uninstall", PLUGIN_ID);
			},
		},
		"content:beforeSave": {
			handler: onContentBeforeSave,
		},
		"content:afterSave": {
			handler: onContentAfterSave,
		},
		"content:afterDelete": {
			handler: onContentAfterDelete,
		},
		"media:afterUpload": {
			handler: onMediaAfterUpload,
		},
		"comment:afterCreate": {
			handler: onCommentAfterCreate,
		},
		"comment:afterModerate": {
			handler: onCommentAfterModerate,
		},
		"email:afterSend": {
			handler: onEmailAfterSend,
		},
	},

	routes: {
		"record-auth": {
			handler: async (routeCtx, ctx) => {
				const input = parseAuthInput(routeCtx.input);
				if (!input) {
					return { success: false, error: "Invalid auth audit payload" };
				}
				await recordAuthEvent(ctx, input);
				return { success: true };
			},
		},

		admin: {
			handler: async (routeCtx, ctx) => {
				const interaction = routeCtx.input as BlockInteraction;

				if (interaction.type === "page_load" && interaction.page === "/login") {
					return renderLoginPage(ctx);
				}
				if (interaction.type === "page_load" && interaction.page === "/actions") {
					return renderActionsPage(ctx);
				}
				if (interaction.type === "page_load" && interaction.page === "widget:recent-audit") {
					return renderRecentWidget(ctx);
				}
				if (
					interaction.type === "block_action" &&
					(interaction.action_id === "login-page-prev" ||
						interaction.action_id === "login-page-next")
				) {
					const state = applyPageNav(interaction.value);
					if (state) return renderLoginPage(ctx, state);
				}
				if (
					interaction.type === "block_action" &&
					(interaction.action_id === "actions-page-prev" ||
						interaction.action_id === "actions-page-next")
				) {
					const state = applyPageNav(interaction.value);
					if (state) return renderActionsPage(ctx, state);
				}

				return { blocks: [] };
			},
		},
	},
} satisfies SandboxedPlugin;
