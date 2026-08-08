export interface AuditRequestActor {
	id?: string;
	email?: string;
	name?: string;
}

const ACTOR_TTL_MS = 15_000;

interface ActorStore {
	lastMutationActor?: { actor: AuditRequestActor; at: number };
	actorsByContentKey: Map<string, { actor: AuditRequestActor; at: number }>;
}

const actorStore: ActorStore = {
	actorsByContentKey: new Map(),
};

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
	actorStore.lastMutationActor = { actor, at: Date.now() };
}

export function rememberContentActor(
	collection: string,
	contentKey: string,
	actor: AuditRequestActor | undefined,
): void {
	if (!actor?.id && !actor?.email) return;
	actorStore.actorsByContentKey.set(`${collection}:${contentKey}`, { actor, at: Date.now() });
}

export function getAuditRequestActor(content?: {
	collection?: string;
	contentKey?: string;
}): AuditRequestActor | undefined {
	if (content?.collection && content.contentKey) {
		const keyed = actorStore.actorsByContentKey.get(`${content.collection}:${content.contentKey}`);
		if (keyed && isFresh(keyed.at)) {
			return keyed.actor;
		}
	}

	if (actorStore.lastMutationActor && isFresh(actorStore.lastMutationActor.at)) {
		return actorStore.lastMutationActor.actor;
	}

	return undefined;
}

export function clearContentActor(collection: string, contentKey: string): void {
	actorStore.actorsByContentKey.delete(`${collection}:${contentKey}`);
}
