import type { PluginContext } from "emdash";
import type { AuditEvent, AuthAuditInput } from "./types.js";
import { getAuditRequestActor } from "./request-actor.js";
import { notifySuccessfulLogin } from "./login-notify.js";

export const PLUGIN_ID = "fastcurve-audit-log";

export function makeEventId(suffix: string): string {
	return `${Date.now()}-${suffix.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80)}`;
}

function authSummary(input: AuthAuditInput): string {
	const label = input.actorEmail ?? input.actorName;
	if (input.action === "logout") {
		return label ? `Logout: ${label}` : "Logout";
	}
	if (input.status === "failure" || input.action === "login_failed") {
		return `Failed login via ${input.path}`;
	}
	return label ? `Login: ${label}` : `Login via ${input.path}`;
}

async function resolveActorDetails(
	ctx: PluginContext,
	actorId?: string,
): Promise<{ actorEmail?: string; actorName?: string }> {
	if (!actorId || !ctx.users) return {};

	try {
		const user = await ctx.users.get(actorId);
		if (!user) return {};
		return {
			actorEmail: user.email ?? undefined,
			actorName: user.name ?? undefined,
		};
	} catch {
		return {};
	}
}

async function enrichEvent(ctx: PluginContext, event: AuditEvent): Promise<AuditEvent> {
	if (event.actorEmail || !event.actorId) return event;

	const resolved = await resolveActorDetails(ctx, event.actorId);
	return {
		...event,
		actorEmail: resolved.actorEmail ?? event.actorEmail,
		details: resolved.actorName
			? { ...event.details, actorName: resolved.actorName }
			: event.details,
	};
}

export async function recordEvent(ctx: PluginContext, event: AuditEvent): Promise<void> {
	try {
		let payload = event;
		if (!payload.actorId && !payload.actorEmail) {
			const actor = getAuditRequestActor();
			if (actor?.id || actor?.email) {
				payload = {
					...payload,
					actorId: actor.id ?? payload.actorId,
					actorEmail: actor.email ?? payload.actorEmail,
				};
			}
		}

		const id = makeEventId(payload.resourceId ?? payload.action);
		const enriched = await enrichEvent(ctx, payload);
		await ctx.storage.events.put(id, enriched);
	} catch (error) {
		ctx.log.error("Failed to persist audit event", {
			error: error instanceof Error ? error.message : String(error),
			action: event.action,
		});
	}
}

export async function recordAuthEvent(ctx: PluginContext, input: AuthAuditInput): Promise<void> {
	const resolved =
		input.actorEmail || !input.actorId
			? { actorEmail: input.actorEmail, actorName: input.actorName }
			: await resolveActorDetails(ctx, input.actorId);

	const actorEmail = input.actorEmail ?? resolved.actorEmail;
	const actorName = input.actorName ?? resolved.actorName;

	await recordEvent(ctx, {
		timestamp: new Date().toISOString(),
		category: "auth",
		action: input.action,
		summary: authSummary({ ...input, actorEmail, actorName }),
		status: input.status,
		actorId: input.actorId,
		actorEmail,
		actorIp: input.actorIp ?? input.actorIpv4 ?? input.actorIpv6,
		actorIpv4: input.actorIpv4,
		actorIpv6: input.actorIpv6,
		resourceType: "session",
		details: { path: input.path, ...(actorName ? { actorName } : {}), ...input.details },
	});

	await notifySuccessfulLogin(ctx, { ...input, actorEmail, actorName });
}
