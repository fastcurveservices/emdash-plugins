import type { PluginDescriptor } from "emdash";

export function visitorTrackerPlugin(): PluginDescriptor {
	return {
		id: "fastcurve-visitor-tracker",
		version: "1.0.1",
		format: "standard",
		entrypoint: "@fastcurve/visitor-tracker/sandbox",
		options: {},
		storage: {
			visitors: {
				indexes: ["firstSeen", "lastSeen", "visitCount", ["lastSeen", "visitCount"]],
			},
			hits: {
				indexes: ["timestamp", "visitorKey", "path", ["timestamp", "visitorKey"]],
			},
		},
		adminPages: [
			{ path: "/visitors", label: "Visitors", icon: "users" },
			{ path: "/hits", label: "Page Views", icon: "activity" },
		],
		adminWidgets: [{ id: "visitor-stats", title: "Visitor Stats", size: "half" }],
	};
}
