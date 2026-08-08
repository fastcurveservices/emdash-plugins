import type {
	CommentHookEvent,
	ContentHookEvent,
	MediaUploadHookEvent,
	PluginContext,
} from "emdash";
import type { AuditEvent } from "./types.js";
import { recordEvent } from "./record.js";
import {
	clearContentActor,
	getAuditRequestActor,
	rememberContentActor,
	stashMutationActor,
} from "./request-actor.js";

function resolveActor(content?: Record<string, unknown>, collection?: string): {
	actorId?: string;
	actorEmail?: string;
} {
	const contentKey =
		content && typeof content.id === "string"
			? content.id
			: content && typeof content.slug === "string"
				? content.slug
				: undefined;

	const requestActor = getAuditRequestActor(
		collection && contentKey ? { collection, contentKey } : undefined,
	);
	if (requestActor?.id || requestActor?.email) {
		return {
			actorId: requestActor.id,
			actorEmail: requestActor.email,
		};
	}

	if (!content) return {};
	const authorId = content.authorId;
	return {
		actorId: typeof authorId === "string" ? authorId : undefined,
	};
}

function contentId(content: Record<string, unknown>): string {
	const id = content.id;
	return typeof id === "string" ? id : "";
}

function contentTitle(content: Record<string, unknown>): string {
	const data = content.data;
	if (data && typeof data === "object" && !Array.isArray(data)) {
		const title = (data as Record<string, unknown>).title;
		if (typeof title === "string" && title.trim()) return title;
	}
	const title = content.title;
	return typeof title === "string" ? title : "";
}

async function logContentEvent(
	ctx: PluginContext,
	event: ContentHookEvent,
	action: AuditEvent["action"],
): Promise<void> {
	const id = contentId(event.content);
	if (!id) return;

	const title = contentTitle(event.content);
	const summary = title
		? `${action} ${event.collection}: ${title}`
		: `${action} ${event.collection}/${id}`;

	const actor = resolveActor(event.content, event.collection);

	await recordEvent(ctx, {
		timestamp: new Date().toISOString(),
		category: "content",
		action,
		summary,
		status: "success",
		actorId: actor.actorId,
		actorEmail: actor.actorEmail,
		resourceType: "content",
		resourceId: id,
		collection: event.collection,
		details: {
			slug: event.content.slug,
			status: event.content.status,
			isNew: event.isNew,
		},
	});
}

export async function onContentAfterSave(event: ContentHookEvent, ctx: PluginContext): Promise<void> {
	await logContentEvent(ctx, event, event.isNew ? "create" : "update");
	if (typeof event.content.id === "string") {
		clearContentActor(event.collection, event.content.id);
	}
}

export async function onContentBeforeSave(event: ContentHookEvent, ctx: PluginContext): Promise<void> {
	const actor = getAuditRequestActor();
	const contentKey =
		typeof event.content.id === "string"
			? event.content.id
			: typeof event.content.slug === "string"
				? event.content.slug
				: undefined;
	if (contentKey) {
		rememberContentActor(event.collection, contentKey, actor);
	}
	return event.content;
}

export async function onContentAfterDelete(
	event: { id: string; collection: string },
	ctx: PluginContext,
): Promise<void> {
	const actor = resolveActor();

	await recordEvent(ctx, {
		timestamp: new Date().toISOString(),
		category: "content",
		action: "delete",
		summary: `delete ${event.collection}/${event.id}`,
		status: "success",
		actorId: actor.actorId,
		actorEmail: actor.actorEmail,
		resourceType: "content",
		resourceId: event.id,
		collection: event.collection,
	});
}

export async function onContentLifecycle(
	event: ContentHookEvent,
	ctx: PluginContext,
	action: AuditEvent["action"],
): Promise<void> {
	await logContentEvent(ctx, event, action);
	if (typeof event.content.id === "string") {
		clearContentActor(event.collection, event.content.id);
	}
}

export async function onMediaAfterUpload(
	event: MediaUploadHookEvent,
	ctx: PluginContext,
): Promise<void> {
	const actor = resolveActor();

	await recordEvent(ctx, {
		timestamp: new Date().toISOString(),
		category: "media",
		action: "upload",
		summary: `upload media: ${event.media.filename}`,
		status: "success",
		actorId: actor.actorId,
		actorEmail: actor.actorEmail,
		resourceType: "media",
		resourceId: event.media.id,
		details: {
			filename: event.media.filename,
			mimeType: event.media.mimeType,
			size: event.media.size,
		},
	});
}

export async function onCommentAfterCreate(
	event: CommentHookEvent,
	ctx: PluginContext,
): Promise<void> {
	const actor = resolveActor();
	const actorId = actor.actorId ?? event.comment.userId ?? undefined;
	const actorEmail = actor.actorEmail;

	await recordEvent(ctx, {
		timestamp: new Date().toISOString(),
		category: "comment",
		action: "create",
		summary: `new comment on ${event.comment.contentType}/${event.comment.contentId}`,
		status: "success",
		actorId,
		actorEmail,
		resourceType: "comment",
		resourceId: event.comment.id,
		details: {
			contentType: event.comment.contentType,
			contentId: event.comment.contentId,
			status: event.comment.status,
		},
	});
}

export async function onCommentAfterModerate(
	event: CommentHookEvent,
	ctx: PluginContext,
): Promise<void> {
	const actor = resolveActor();
	const actorId = actor.actorId ?? event.comment.userId ?? undefined;
	const actorEmail = actor.actorEmail;

	await recordEvent(ctx, {
		timestamp: new Date().toISOString(),
		category: "comment",
		action: "moderate",
		summary: `moderate comment ${event.comment.id} → ${event.comment.status}`,
		status: "success",
		actorId,
		actorEmail,
		resourceType: "comment",
		resourceId: event.comment.id,
		details: {
			status: event.comment.status,
			contentType: event.comment.contentType,
			contentId: event.comment.contentId,
		},
	});
}

export async function onPluginLifecycle(
	ctx: PluginContext,
	action: string,
	pluginId?: string,
): Promise<void> {
	await recordEvent(ctx, {
		timestamp: new Date().toISOString(),
		category: "plugin",
		action,
		summary: pluginId ? `${action} plugin ${pluginId}` : action,
		status: "success",
		resourceType: "plugin",
		resourceId: pluginId,
	});
}

export async function onEmailAfterSend(
	event: { message: { to: string; subject: string }; source: string },
	ctx: PluginContext,
): Promise<void> {
	await recordEvent(ctx, {
		timestamp: new Date().toISOString(),
		category: "email",
		action: "send",
		summary: `email to ${event.message.to}: ${event.message.subject}`,
		status: "success",
		resourceType: "email",
		details: {
			to: event.message.to,
			subject: event.message.subject,
			source: event.source,
		},
	});
}
