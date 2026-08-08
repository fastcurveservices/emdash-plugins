import type { PluginContext } from "emdash";
import type { VisitHit, VisitorRecord } from "./types.js";
import {
	buildTable,
	buildTablePagination,
	initialPageState,
	keysetWhere,
	nextPageCursor,
	type TablePageState,
} from "./table-block.js";

const PAGE_SIZE = 10;

interface VisitorRow {
	visitor: string;
	visits: string;
	firstSeen: string;
	lastSeen: string;
}

interface HitRow {
	path: string;
	visitor: string;
	time: string;
}

function isVisitorRecord(value: unknown): value is VisitorRecord {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const record = value as Record<string, unknown>;
	return (
		typeof record.visitorKey === "string" &&
		typeof record.firstSeen === "string" &&
		typeof record.lastSeen === "string" &&
		typeof record.visitCount === "number"
	);
}

function isVisitHit(value: unknown): value is VisitHit {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const hit = value as Record<string, unknown>;
	return (
		typeof hit.timestamp === "string" &&
		typeof hit.visitorKey === "string" &&
		typeof hit.path === "string"
	);
}

function shortKey(key: string): string {
	return key.length <= 12 ? key : `${key.slice(0, 8)}…${key.slice(-3)}`;
}

function toVisitorRow(record: VisitorRecord): VisitorRow {
	return {
		visitor: shortKey(record.visitorKey),
		visits: String(record.visitCount),
		firstSeen: record.firstSeen,
		lastSeen: record.lastSeen,
	};
}

function toHitRow(hit: VisitHit): HitRow {
	return {
		path: hit.path,
		visitor: shortKey(hit.visitorKey),
		time: hit.timestamp,
	};
}

function startOfTodayIso(): string {
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	return start.toISOString();
}

async function queryVisitors(ctx: PluginContext, options: { limit?: number; cursor?: string }) {
	const sortField = "lastSeen";
	const pageWhere = keysetWhere(sortField, options.cursor);
	const result = await ctx.storage.visitors.query({
		...(pageWhere ? { where: pageWhere } : {}),
		orderBy: { [sortField]: "desc" },
		limit: options.limit ?? PAGE_SIZE,
	});

	const rows = result.items
		.map((item) => ({
			id: item.id,
			data: item.data,
		}))
		.filter((item): item is { id: string; data: VisitorRecord } => isVisitorRecord(item.data));

	return {
		visitors: rows.map((item) => item.data),
		cursor: nextPageCursor(
			rows.map((item) => ({ id: item.id, sortValue: item.data.lastSeen })),
			result.hasMore,
		),
		hasMore: result.hasMore,
	};
}

async function queryHits(ctx: PluginContext, options: { limit?: number; cursor?: string }) {
	const sortField = "timestamp";
	const pageWhere = keysetWhere(sortField, options.cursor);
	const result = await ctx.storage.hits.query({
		...(pageWhere ? { where: pageWhere } : {}),
		orderBy: { [sortField]: "desc" },
		limit: options.limit ?? PAGE_SIZE,
	});

	const rows = result.items
		.map((item) => ({
			id: item.id,
			data: item.data,
		}))
		.filter((item): item is { id: string; data: VisitHit } => isVisitHit(item.data));

	return {
		hits: rows.map((item) => item.data),
		cursor: nextPageCursor(
			rows.map((item) => ({ id: item.id, sortValue: item.data.timestamp })),
			result.hasMore,
		),
		hasMore: result.hasMore,
	};
}

async function countNewVisitorsToday(ctx: PluginContext): Promise<number> {
	return ctx.storage.visitors.count({ firstSeen: { gte: startOfTodayIso() } });
}

async function countHitsToday(ctx: PluginContext): Promise<number> {
	return ctx.storage.hits.count({ timestamp: { gte: startOfTodayIso() } });
}

export async function renderVisitorsPage(ctx: PluginContext, pageState?: TablePageState) {
	const state = pageState ?? initialPageState();
	const cursor = state.cursors[state.pageIndex];
	const [{ visitors, cursor: forwardCursor, hasMore }, total] = await Promise.all([
		queryVisitors(ctx, { limit: PAGE_SIZE, cursor }),
		ctx.storage.visitors.count(),
	]);
	const rows = visitors.map(toVisitorRow);

	return {
		blocks: [
			{ type: "header" as const, text: "Unique Visitors" },
			{
				type: "context" as const,
				text: "Distinct visitors keyed by a site-computed hash. Raw IP addresses and User-Agent strings are not stored by this plugin.",
			},
			{ type: "divider" as const },
			buildTable({
				blockId: "visitors-table",
				pageActionId: "visitors-table-page",
				columns: [
					{ key: "visitor", label: "Visitor", format: "code" },
					{ key: "visits", label: "Visits", format: "text" },
					{ key: "firstSeen", label: "First seen", format: "relative_time" },
					{ key: "lastSeen", label: "Last seen", format: "relative_time" },
				],
				rows,
				emptyText: "No visitors recorded yet",
			}),
			...buildTablePagination({
				blockId: "visitors-pagination",
				prevActionId: "visitors-page-prev",
				nextActionId: "visitors-page-next",
				state,
				totalItems: total,
				pageSize: PAGE_SIZE,
				hasMore,
				forwardCursor,
				itemLabel: "visitors",
			}),
		],
	};
}

export async function renderHitsPage(ctx: PluginContext, pageState?: TablePageState) {
	const state = pageState ?? initialPageState();
	const cursor = state.cursors[state.pageIndex];
	const [{ hits, cursor: forwardCursor, hasMore }, total] = await Promise.all([
		queryHits(ctx, { limit: PAGE_SIZE, cursor }),
		ctx.storage.hits.count(),
	]);
	const rows = hits.map(toHitRow);

	return {
		blocks: [
			{ type: "header" as const, text: "Page Views" },
			{
				type: "context" as const,
				text: "Individual public page requests with path and timestamp only. No IP, User-Agent, or referer data is stored.",
			},
			{ type: "divider" as const },
			buildTable({
				blockId: "hits-table",
				pageActionId: "hits-table-page",
				columns: [
					{ key: "path", label: "Path", format: "code" },
					{ key: "visitor", label: "Visitor", format: "code" },
					{ key: "time", label: "Time", format: "relative_time" },
				],
				rows,
				emptyText: "No page views recorded yet",
			}),
			...buildTablePagination({
				blockId: "hits-pagination",
				prevActionId: "hits-page-prev",
				nextActionId: "hits-page-next",
				state,
				totalItems: total,
				pageSize: PAGE_SIZE,
				hasMore,
				forwardCursor,
				itemLabel: "page views",
			}),
		],
	};
}

export async function renderStatsWidget(ctx: PluginContext) {
	const [newToday, hitsToday] = await Promise.all([
		countNewVisitorsToday(ctx),
		countHitsToday(ctx),
	]);

	return {
		blocks: [
			{
				type: "fields" as const,
				fields: [
					{ label: "New visitors today", value: String(newToday) },
					{ label: "Page views today", value: String(hitsToday) },
				],
			},
			{
				type: "context" as const,
				text: "Counts reset at midnight server time. Admin and API routes are not tracked.",
			},
		],
	};
}
