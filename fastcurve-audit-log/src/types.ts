export type AuditCategory = "auth" | "content" | "media" | "comment" | "plugin" | "email";

export type AuditStatus = "success" | "failure" | "denied";

export interface AuditEvent {
	timestamp: string;
	category: AuditCategory;
	action: string;
	summary: string;
	status: AuditStatus;
	actorId?: string;
	actorEmail?: string;
	/** SHA-256 fingerprint of client network identifiers; raw IPs are not stored. */
	actorSourceKey?: string;
	resourceType?: string;
	resourceId?: string;
	collection?: string;
	details?: Record<string, unknown>;
}

export interface AuthAuditInput {
	action: "login" | "logout" | "login_failed";
	status: AuditStatus;
	actorId?: string;
	actorEmail?: string;
	actorName?: string;
	actorIp?: string;
	actorIpv4?: string;
	actorIpv6?: string;
	path: string;
	details?: Record<string, unknown>;
}
