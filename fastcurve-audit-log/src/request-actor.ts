export interface AuditRequestActor {
	id?: string;
	email?: string;
	name?: string;
}

const ACTOR_TTL_MS = 15_000;
const STORE_KEY = Symbol.for("fastcurve-audit-log:request-actor");

interface ActorStore {
	lastMutationActor?: { actor: AuditRequestActor; at: number };
	actorsByContentKey: Map<string, { actor: AuditRequestActor; at: number }>;
}

function getStore(): ActorStore {
	const globalStore = globalThis as typeof globalThis & {
		[STORE_KEY]?: ActorStore;
	};
	if (!globalStore[STORE_KEY]) {
		globalStore[STORE_KEY] = {
			actorsByContentKey: new Map(),
		};
	}
	return globalStore[STORE_KEY];
}

function isFresh(at: number): boolean {
	return Date.now() - at <= ACTOR_TTL_MS;
}

export function actorFromUser(user: {
	id: string;
	email: string;
	name?: string | null;
} | undefined): AuditRequestActor | undefined {
	if (!user) return undefined;
	return {
		id: user.id,
		email: user.email,
		name: user.name ?? undefined,
	};
}

export function stashMutationActor(actor: AuditRequestActor | undefined): void {
	if (!actor?.id && !actor?.email) return;
	getStore().lastMutationActor = { actor, at: Date.now() };
}

export function rememberContentActor(
	collection: string,
	contentKey: string,
	actor: AuditRequestActor | undefined,
): void {
	if (!actor?.id && !actor?.email) return;
	getStore().actorsByContentKey.set(`${collection}:${contentKey}`, { actor, at: Date.now() });
}

export function getAuditRequestActor(content?: {
	collection?: string;
	contentKey?: string;
}): AuditRequestActor | undefined {
	const store = getStore();

	if (content?.collection && content.contentKey) {
		const keyed = store.actorsByContentKey.get(`${content.collection}:${content.contentKey}`);
		if (keyed && isFresh(keyed.at)) {
			return keyed.actor;
		}
	}

	if (store.lastMutationActor && isFresh(store.lastMutationActor.at)) {
		return store.lastMutationActor.actor;
	}

	return undefined;
}

export function clearContentActor(collection: string, contentKey: string): void {
	getStore().actorsByContentKey.delete(`${collection}:${contentKey}`);
}
