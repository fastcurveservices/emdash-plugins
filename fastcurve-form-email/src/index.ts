import type { PluginDescriptor } from "emdash";

export function formEmailPlugin(): PluginDescriptor {
	return {
		id: "fastcurve-form-email",
		version: "1.0.1",
		format: "standard",
		entrypoint: "@fastcurve/form-email/sandbox",
		options: {},
		capabilities: ["content:read", "email:send"],
	};
}
