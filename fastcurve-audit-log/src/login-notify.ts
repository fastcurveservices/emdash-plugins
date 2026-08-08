import type { EmailMessage, PluginContext } from "emdash";
import { resolveFormNotifyTo } from "./notify-to.js";
import {
	renderLoginNotificationHtml,
	renderLoginNotificationText,
	type LoginEmailContent,
} from "./render-template.js";
import { brandingFromContext } from "./site-branding.js";
import { formatSourceKey } from "./ip-fingerprint.js";
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
	input: AuthAuditInput & { actorEmail?: string; actorName?: string; actorSourceKey?: string },
): LoginEmailContent {
	return {
		userLabel: userLabel(input),
		userEmail: input.actorEmail ?? "—",
		actorSourceKey: formatSourceKey(input.actorSourceKey),
		authPath: input.path,
		receivedAt: `${formatTime()} (IST)`,
	};
}

export async function buildLoginNotificationEmail(
	ctx: PluginContext,
	input: AuthAuditInput & { actorEmail?: string; actorName?: string; actorSourceKey?: string },
): Promise<EmailMessage | null> {
	const notifyTo = await resolveFormNotifyTo(ctx);
	if (!notifyTo) return null;

	const content = toEmailContent(input);
	const label = userLabel(input);
	const branding = brandingFromContext(ctx);

	return {
		to: notifyTo,
		subject: `[Site Admin] Login: ${label}`,
		text: renderLoginNotificationText(content, branding),
		html: renderLoginNotificationHtml(content, branding),
	};
}

export async function notifySuccessfulLogin(
	ctx: PluginContext,
	input: AuthAuditInput & { actorEmail?: string; actorName?: string; actorSourceKey?: string },
): Promise<void> {
	if (input.action !== "login" || input.status !== "success") return;

	if (!ctx.email) {
		ctx.log.warn("Email pipeline unavailable; login notification skipped");
		return;
	}

	const email = await buildLoginNotificationEmail(ctx, input);
	if (!email) {
		ctx.log.warn("Login notify recipient is not configured; notification skipped");
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
