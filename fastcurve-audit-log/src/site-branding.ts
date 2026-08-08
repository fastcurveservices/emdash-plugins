import type { PluginContext } from "emdash";

export interface SiteBranding {
	siteName: string;
	siteShort: string;
}

export function brandingFromContext(ctx: PluginContext): SiteBranding {
	const siteName = ctx.site.name.trim() || "Your Site Name";
	return {
		siteName,
		siteShort: siteShortFromName(siteName),
	};
}

function siteShortFromName(name: string): string {
	const words = name.split(/\s+/).filter(Boolean);
	if (words.length >= 2) {
		return words
			.map((word) => word[0]?.toUpperCase() ?? "")
			.join("")
			.slice(0, 8);
	}
	return name.slice(0, 12);
}
