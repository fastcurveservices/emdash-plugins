import type { PluginContext } from "emdash";
import type { AuditEvent } from "./types.js";
import { formatSourceKey } from "./ip-fingerprint.js";
import {
	buildTable,
	buildTablePagination,
	initialPageState,
	keysetWhere,
	nextPageCursor,
	type TablePageState,
} from "./table-block.js";

const PAGE_SIZE = 10;

interface TableRow {
	action: string;
	summary: string;
	actor: string;
	source: string;
	resource: string;
	time: string;
	status: string;
}

function asString(value: unknown): string {
	if (typeof value === "string") return value;
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	return "";
}

function isAuditEvent(value: unknown): value is AuditEvent {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const event = value as Record<string, unknown>;
	return (
		typeof event.timestamp === "string" &&
		typeof event.category === "string" &&
		typeof event.action === "string" &&
		typeof event.summary === "string"
	);
}

async function resolveActorLabel(ctx: PluginContext, event: AuditEvent): Promise<string> {
	if (event.actorEmail) return event.actorEmail;

	const actorName =
		event.details && typeof event.details.actorName === "string"
			? event.details.actorName
			: undefined;
	if (actorName) return actorName;

	if (!event.actorId) return "—";
	if (!ctx.users) return event.actorId;

	try {
		const user = await ctx.users.get(event.actorId);
		if (user?.email) return user.email;
		if (user?.name) return user.name;
	} catch {
		// Fall back to raw id.
	}
	return event.actorId;
}

async function toTableRow(ctx: PluginContext, event: AuditEvent): Promise<TableRow> {
	const actor = await resolveActorLabel(ctx, event);
	const resource = event.resourceId
		? `${event.collection ? `${event.collection}/` : ""}${event.resourceId}`
		: "—";

	return {
		action: event.action,
		summary: event.summary,
		actor,
		source: formatSourceKey(event.actorSourceKey),
		resource,
		time: event.timestamp,
		status: event.status ?? "success",
	};
}

const ACTION_CATEGORIES = ["content", "media", "comment", "plugin", "email"] as const;

async function queryEvents(
	ctx: PluginContext,
	options: {
		category?: AuditEvent["category"];
		categories?: readonly AuditEvent["category"][];
		limit?: number;
		cursor?: string;
	},
) {
	const sortField = "timestamp";
	const pageWhere = keysetWhere(sortField, options.cursor) ?? {};
	const where = {
		...pageWhere,
		...(options.category ? { category: options.category } : {}),
		...(options.categories ? { category: { in: [...options.categories] } } : {}),
	};

	const result = await ctx.storage.events.query({
		where,
		orderBy: { [sortField]: "desc" },
		limit: options.limit ?? PAGE_SIZE,
	});

	const rows = result.items
		.map((item) => ({ id: item.id, data: item.data }))
		.filter((item): item is { id: string; data: AuditEvent } => isAuditEvent(item.data));

	return {
		events: rows.map((item) => item.data),
		cursor: nextPageCursor(
			rows.map((item) => ({ id: item.id, sortValue: item.data.timestamp })),
			result.hasMore,
		),
		hasMore: result.hasMore,
	};
}

async function buildTableBlocks(
	ctx: PluginContext,
	title: string,
	description: string,
	events: AuditEvent[],
	options: {
		pageActionId: string;
		blockId: string;
		paginationBlockId: string;
		prevActionId: string;
		nextActionId: string;
		pageState: TablePageState;
		hasMore: boolean;
		forwardCursor?: string;
		total: number;
		itemLabel: string;
	},
) {
	const rows = await Promise.all(events.map((event) => toTableRow(ctx, event)));

	return {
		blocks: [
			{ type: "header" as const, text: title },
			{ type: "context" as const, text: description },
			{ type: "divider" as const },
			buildTable({
				blockId: options.blockId,
				pageActionId: options.pageActionId,
				columns: [
					{ key: "action", label: "Action", format: "badge" },
					{ key: "summary", label: "Summary", format: "text" },
					{ key: "actor", label: "User", format: "text" },
					{ key: "source", label: "Source", format: "code" },
					{ key: "resource", label: "Resource", format: "code" },
					{ key: "status", label: "Status", format: "badge" },
					{ key: "time", label: "Time", format: "relative_time" },
				],
				rows,
				emptyText: "No audit entries yet",
			}),
			...buildTablePagination({
				blockId: options.paginationBlockId,
				prevActionId: options.prevActionId,
				nextActionId: options.nextActionId,
				state: options.pageState,
				totalItems: options.total,
				pageSize: PAGE_SIZE,
				hasMore: options.hasMore,
				forwardCursor: options.forwardCursor,
				itemLabel: options.itemLabel,
			}),
		],
	};
}

export async function renderLoginPage(ctx: PluginContext, pageState?: TablePageState) {
	const state = pageState ?? initialPageState();
	const cursor = state.cursors[state.pageIndex];
	const [{ events, cursor: forwardCursor, hasMore }, total] = await Promise.all([
		queryEvents(ctx, {
			category: "auth",
			limit: PAGE_SIZE,
			cursor,
		}),
		ctx.storage.events.count({ category: "auth" }),
	]);

	return buildTableBlocks(
		ctx,
		"Login Activity",
		"Successful logins, failed attempts, and logouts. Network source fingerprints are hashed; raw IPs are not stored.",
		events,
		{
			pageActionId: "login-table-page",
			blockId: "login-audit-table",
			paginationBlockId: "login-pagination",
			prevActionId: "login-page-prev",
			nextActionId: "login-page-next",
			pageState: state,
			hasMore,
			forwardCursor,
			total,
			itemLabel: "entries",
		},
	);
}

export async function renderActionsPage(ctx: PluginContext, pageState?: TablePageState) {
	const state = pageState ?? initialPageState();
	const cursor = state.cursors[state.pageIndex];
	const [{ events, cursor: forwardCursor, hasMore }, total] = await Promise.all([
		queryEvents(ctx, {
			categories: ACTION_CATEGORIES,
			limit: PAGE_SIZE,
			cursor,
		}),
		ctx.storage.events.count(),
	]);

	return buildTableBlocks(
		ctx,
		"Action Audit",
		"Content, media, comment, plugin, and email activity. 10 rows per page.",
		events,
		{
			pageActionId: "actions-table-page",
			blockId: "actions-audit-table",
			paginationBlockId: "actions-pagination",
			prevActionId: "actions-page-prev",
			nextActionId: "actions-page-next",
			pageState: state,
			hasMore,
			forwardCursor,
			total,
			itemLabel: "entries",
		},
	);
}

export async function renderRecentWidget(ctx: PluginContext) {
	const { events } = await queryEvents(ctx, { limit: 8 });

	if (events.length === 0) {
		return { blocks: [{ type: "context" as const, text: "No recent activity" }] };
	}

	const fields = await Promise.all(
		events.slice(0, 4).map(async (event) => ({
			label: event.action,
			value: `${await resolveActorLabel(ctx, event)} — ${asString(event.summary).slice(0, 60)}`,
		})),
	);

	return {
		blocks: [
			{ type: "fields" as const, fields },
			{ type: "context" as const, text: `${events.length} recent events` },
		],
	};
}
