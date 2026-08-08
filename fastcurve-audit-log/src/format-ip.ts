import { ipKind } from "./is-ip.js";

export function formatAuditEventIp(event: {
	actorIp?: string;
	actorIpv4?: string;
	actorIpv6?: string;
}): string {
	const ipv4 = event.actorIpv4;
	const ipv6 = event.actorIpv6;

	if (ipv4 && ipv6) return `${ipv4} · ${ipv6}`;
	if (ipv4) return ipv4;
	if (ipv6) return ipv6;

	if (!event.actorIp) return "—";

	return ipKind(event.actorIp) ? event.actorIp : event.actorIp;
}

export function auditEventIpFields(event: {
	actorIp?: string;
	actorIpv4?: string;
	actorIpv6?: string;
}): { actorIpv4: string; actorIpv6: string } {
	if (event.actorIpv4 || event.actorIpv6) {
		return {
			actorIpv4: event.actorIpv4 ?? "—",
			actorIpv6: event.actorIpv6 ?? "—",
		};
	}

	if (event.actorIp) {
		const kind = ipKind(event.actorIp);
		if (kind === 4) return { actorIpv4: event.actorIp, actorIpv6: "—" };
		if (kind === 6) return { actorIpv4: "—", actorIpv6: event.actorIp };
	}

	return { actorIpv4: "—", actorIpv6: "—" };
}
