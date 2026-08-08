interface TableColumn {
	key: string;
	label: string;
	format?: "text" | "code" | "badge" | "relative_time";
	sortable?: boolean;
}

export interface PageCursor {
	sortValue: string;
	id: string;
}

export interface TablePageState {
	pageIndex: number;
	/** cursors[i] is the keyset cursor used to load page i (undefined for page 0). */
	cursors: (string | undefined)[];
}

interface TablePageNavPayload extends TablePageState {
	direction?: "next" | "prev";
	forwardCursor?: string;
}

/** Build a Block Kit table block (snake_case wire format). Omits next_cursor so Load more is hidden. */
export function buildTable(options: {
	blockId: string;
	pageActionId: string;
	columns: TableColumn[];
	rows: Array<Record<string, string>>;
	emptyText?: string;
}) {
	return {
		type: "table" as const,
		block_id: options.blockId,
		columns: options.columns,
		rows: options.rows,
		page_action_id: options.pageActionId,
		...(options.emptyText ? { empty_text: options.emptyText } : {}),
	};
}

export function initialPageState(): TablePageState {
	return { pageIndex: 0, cursors: [undefined] };
}

export function parsePageNavState(value: unknown): TablePageState {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return initialPageState();
	}

	const payload = value as TablePageNavPayload;
	const pageIndex =
		typeof payload.pageIndex === "number" && payload.pageIndex >= 0
			? Math.floor(payload.pageIndex)
			: 0;
	const cursors = Array.isArray(payload.cursors)
		? payload.cursors.map((cursor) => (typeof cursor === "string" ? cursor : undefined))
		: [undefined];

	if (cursors.length === 0) cursors.push(undefined);

	return {
		pageIndex: Math.min(pageIndex, cursors.length - 1),
		cursors,
	};
}

export function applyPageNav(value: unknown): TablePageState | undefined {
	if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

	const payload = value as TablePageNavPayload;
	const direction = payload.direction;
	if (direction !== "next" && direction !== "prev") return undefined;

	const state = parsePageNavState(value);
	if (direction === "prev") {
		if (state.pageIndex <= 0) return undefined;
		return { ...state, pageIndex: state.pageIndex - 1 };
	}

	const nextIndex = state.pageIndex + 1;
	const cursors = [...state.cursors];
	if (nextIndex >= cursors.length) {
		if (typeof payload.forwardCursor !== "string") return undefined;
		cursors.push(payload.forwardCursor);
	}

	return { pageIndex: nextIndex, cursors };
}

/** Prev/Next controls and footer matching the content list pattern. */
export function buildTablePagination(options: {
	blockId: string;
	prevActionId: string;
	nextActionId: string;
	state: TablePageState;
	totalItems: number;
	pageSize: number;
	hasMore: boolean;
	forwardCursor?: string;
	itemLabel?: string;
}) {
	const totalPages = Math.max(1, Math.ceil(options.totalItems / options.pageSize));
	const canPrev = options.state.pageIndex > 0;
	const canNext =
		options.hasMore || options.state.pageIndex + 1 < options.state.cursors.length;
	const navState: TablePageNavPayload = {
		pageIndex: options.state.pageIndex,
		cursors: options.state.cursors,
		forwardCursor: options.forwardCursor,
	};
	const elements = [];

	if (canPrev) {
		elements.push({
			type: "button" as const,
			action_id: options.prevActionId,
			label: "Previous",
			value: { ...navState, direction: "prev" as const },
		});
	}

	if (canNext) {
		elements.push({
			type: "button" as const,
			action_id: options.nextActionId,
			label: "Next",
			value: { ...navState, direction: "next" as const },
		});
	}

	const label = options.itemLabel ?? "items";
	const pageLabel =
		options.totalItems === 0
			? `0 ${label}`
			: `${options.totalItems.toLocaleString()} ${label} · ${options.state.pageIndex + 1} / ${totalPages}`;

	const blocks: Array<Record<string, unknown>> = [];
	if (elements.length > 0) {
		blocks.push({
			type: "actions",
			block_id: options.blockId,
			elements,
		});
	}
	blocks.push({ type: "context", text: pageLabel });

	return blocks;
}

export function encodePageCursor(cursor: PageCursor): string {
	const json = JSON.stringify(cursor);
	if (typeof Buffer !== "undefined") {
		return Buffer.from(json, "utf8").toString("base64url");
	}
	const bytes = new TextEncoder().encode(json);
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodePageCursor(raw?: string): PageCursor | undefined {
	if (!raw) return undefined;
	try {
		let json: string;
		if (typeof Buffer !== "undefined") {
			json = Buffer.from(raw, "base64url").toString("utf8");
		} else {
			const padded = raw.replace(/-/g, "+").replace(/_/g, "/");
			const binary = atob(padded);
			const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
			json = new TextDecoder().decode(bytes);
		}
		const parsed = JSON.parse(json) as { sortValue?: unknown; id?: unknown };
		if (typeof parsed.sortValue === "string" && typeof parsed.id === "string") {
			return { sortValue: parsed.sortValue, id: parsed.id };
		}
	} catch {
		// Fall through.
	}
	return undefined;
}

/** Keyset page on an indexed sort field (desc). EmDash storage cursors use created_at only. */
export function keysetWhere(
	sortField: string,
	cursor?: string,
): Record<string, unknown> | undefined {
	const decoded = decodePageCursor(cursor);
	if (!decoded) return undefined;
	return { [sortField]: { lt: decoded.sortValue } };
}

export function nextPageCursor(
	items: Array<{ id: string; sortValue: string }>,
	hasMore: boolean,
): string | undefined {
	if (!hasMore || items.length === 0) return undefined;
	const last = items[items.length - 1];
	return encodePageCursor({ sortValue: last.sortValue, id: last.id });
}
