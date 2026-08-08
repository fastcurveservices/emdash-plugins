import type { ContentHookEvent, PluginContext } from "emdash";
import type { SandboxedPlugin } from "emdash/plugin";
import { buildFormNotificationEmail } from "./notify.js";

const PLUGIN_ID = "fastcurve-form-email";

function getContactData(content: Record<string, unknown>): Record<string, unknown> {
	const data = content.data;
	if (data && typeof data === "object" && !Array.isArray(data)) {
		return data as Record<string, unknown>;
	}
	return content;
}

async function notifyFormSubmission(event: ContentHookEvent, ctx: PluginContext): Promise<void> {
	if (event.collection !== "contact_messages" || !event.isNew) return;
	if (!ctx.email) {
		ctx.log.warn("Email pipeline unavailable; form notification skipped");
		return;
	}

	const email = buildFormNotificationEmail(getContactData(event.content));
	if (!email) {
		ctx.log.warn("FORM_NOTIFY_TO is not set; form notification skipped");
		return;
	}

	try {
		await ctx.email.send(email, PLUGIN_ID);
		ctx.log.info("Form notification email queued", {
			type: getContactData(event.content).message_type ?? "contact",
			to: email.to,
		});
	} catch (error) {
		ctx.log.error("Form notification email failed", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export default {
	hooks: {
		"content:afterSave": {
			handler: notifyFormSubmission,
		},
	},
} satisfies SandboxedPlugin;
