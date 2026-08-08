import type { EmailMessage, PluginContext } from "emdash";
import { resolveFormNotifyTo } from "./notify-to.js";
import {
	renderLoginNotificationHtml,
	renderLoginNotificationText,
	type LoginEmailContent,
} from "./render-template.js";
import { auditEventIpFields } from "./format-ip.js";
import { PLUGIN_ID } from "./record.js";
import type { AuthAuditInput } from "./types.js";

function formatTime(): string {
	return new Intl.DateTimeFormat("en-IN", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "Asia/Kolkata",
	}).format(new Date());
}

function userLabel(input: AuthAuditInput & { actorEmail?: string; actorName?: string }): string {
	return input.actorName ?? input.actorEmail ?? input.actorId ?? "Unknown user";
}

function toEmailContent(
	input: AuthAuditInput & { actorEmail?: string; actorName?: string },
): LoginEmailContent {
	const { actorIpv4, actorIpv6 } = auditEventIpFields(input);

	return {
		userLabel: userLabel(input),
		userEmail: input.actorEmail ?? "—",
		actorIpv4,
		actorIpv6,
		authPath: input.path,
		receivedAt: `${formatTime()} (IST)`,
	};
}

export function buildLoginNotificationEmail(
	input: AuthAuditInput & { actorEmail?: string; actorName?: string },
): EmailMessage | null {
	const notifyTo = resolveFormNotifyTo();
	if (!notifyTo) return null;

	const content = toEmailContent(input);
	const label = userLabel(input);

	return {
		to: notifyTo,
		subject: `[Site Admin] Login: ${label}`,
		text: renderLoginNotificationText(content),
		html: renderLoginNotificationHtml(content),
	};
}

export async function notifySuccessfulLogin(
	ctx: PluginContext,
	input: AuthAuditInput & { actorEmail?: string; actorName?: string },
): Promise<void> {
	if (input.action !== "login" || input.status !== "success") return;

	if (!ctx.email) {
		ctx.log.warn("Email pipeline unavailable; login notification skipped");
		return;
	}

	const email = buildLoginNotificationEmail(input);
	if (!email) {
		ctx.log.warn("FORM_NOTIFY_TO is not set; login notification skipped");
		return;
	}

	try {
		await ctx.email.send(email, PLUGIN_ID);
		ctx.log.info("Login notification email queued", { to: email.to, user: userLabel(input) });
	} catch (error) {
		ctx.log.error("Login notification email failed", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}
