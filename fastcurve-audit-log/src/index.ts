import type { PluginDescriptor } from "emdash";

export function auditLogPlugin(): PluginDescriptor {
	return {
		id: "fastcurve-audit-log",
		version: "1.0.3",
		format: "standard",
		entrypoint: "@fastcurve/audit-log/sandbox",
		options: {},
		capabilities: [
			"content:read",
			"content:write",
			"media:read",
			"users:read",
			"email:send",
		],
		storage: {
			events: {
				indexes: [
					"timestamp",
					"category",
					"action",
					"actorId",
					"status",
					["category", "timestamp"],
				],
			},
		},
		adminPages: [
			{ path: "/login", label: "Login Activity", icon: "shield" },
			{ path: "/actions", label: "Action Audit", icon: "history" },
		],
		adminWidgets: [{ id: "recent-audit", title: "Recent Audit", size: "half" }],
	};
}
