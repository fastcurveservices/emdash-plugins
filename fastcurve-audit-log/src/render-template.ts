import {
	loginNotificationHtml,
	loginNotificationText,
} from "./template-content.js";
import type { SiteBranding } from "./site-branding.js";

const TEMPLATES: Record<string, string> = {
	"login-notification.html": loginNotificationHtml,
	"login-notification.txt": loginNotificationText,
};

export interface LoginEmailContent {
	userLabel: string;
	userEmail: string;
	actorSourceKey: string;
	authPath: string;
	receivedAt: string;
}

function loadTemplate(name: string): string {
	const template = TEMPLATES[name];
	if (!template) {
		throw new Error(`Unknown email template: ${name}`);
	}
	return template;
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function escapeAttr(value: string): string {
	return escapeHtml(value).replaceAll("'", "&#39;");
}

function buildTemplateVars(
	content: LoginEmailContent,
	branding: SiteBranding,
): Record<string, string> {
	const userEmail = content.userEmail.trim() || "—";
	const short = branding.siteShort;

	return {
		siteName: escapeHtml(branding.siteName),
		siteShort: escapeHtml(short),
		typeLabel: escapeHtml("Admin login"),
		headerIntro: escapeHtml(`A user signed in to the ${short} admin panel.`),
		badgeColor: "#1e3a5f",
		badgeBg: "#eff6ff",
		userLabel: escapeHtml(content.userLabel),
		userEmail: escapeHtml(userEmail),
		userEmailHref: escapeAttr(userEmail === "—" ? "" : userEmail),
		actorSourceKey: escapeHtml(content.actorSourceKey),
		authPath: escapeHtml(content.authPath),
		receivedAt: escapeHtml(content.receivedAt),
		footerNote: escapeHtml(
			`This notification was generated automatically by the ${short} admin audit system. If you do not recognise this login, review Login Activity in the admin and rotate credentials if needed.`,
		),
	};
}

export function renderTemplateFile(
	name: string,
	content: LoginEmailContent,
	branding: SiteBranding,
): string {
	const template = loadTemplate(name);
	const vars = buildTemplateVars(content, branding);

	return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? "");
}

export function renderLoginNotificationHtml(
	content: LoginEmailContent,
	branding: SiteBranding,
): string {
	return renderTemplateFile("login-notification.html", content, branding);
}

export function renderLoginNotificationText(
	content: LoginEmailContent,
	branding: SiteBranding,
): string {
	return renderTemplateFile("login-notification.txt", content, branding);
}
