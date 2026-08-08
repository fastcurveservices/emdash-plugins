import {
	loginNotificationHtml,
	loginNotificationText,
} from "./template-content.js";

const TEMPLATES: Record<string, string> = {
	"login-notification.html": loginNotificationHtml,
	"login-notification.txt": loginNotificationText,
};

export interface LoginEmailContent {
	userLabel: string;
	userEmail: string;
	actorIpv4: string;
	actorIpv6: string;
	authPath: string;
	receivedAt: string;
}

const DEFAULT_SITE_NAME = "Your Site Name";
const DEFAULT_SITE_SHORT = "Site";

function siteName(): string {
	return process.env.SITE_NAME?.trim() || DEFAULT_SITE_NAME;
}

function siteShort(): string {
	return process.env.SITE_SHORT?.trim() || DEFAULT_SITE_SHORT;
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

function buildTemplateVars(content: LoginEmailContent): Record<string, string> {
	const userEmail = content.userEmail.trim() || "—";
	const name = siteName();
	const short = siteShort();

	return {
		siteName: escapeHtml(name),
		siteShort: escapeHtml(short),
		typeLabel: escapeHtml("Admin login"),
		headerIntro: escapeHtml(`A user signed in to the ${short} admin panel.`),
		badgeColor: "#1e3a5f",
		badgeBg: "#eff6ff",
		userLabel: escapeHtml(content.userLabel),
		userEmail: escapeHtml(userEmail),
		userEmailHref: escapeAttr(userEmail === "—" ? "" : userEmail),
		actorIpv4: escapeHtml(content.actorIpv4),
		actorIpv6: escapeHtml(content.actorIpv6),
		authPath: escapeHtml(content.authPath),
		receivedAt: escapeHtml(content.receivedAt),
		footerNote: escapeHtml(
			`This notification was generated automatically by the ${short} admin audit system. If you do not recognise this login, review Login Activity in the admin and rotate credentials if needed.`,
		),
	};
}

export function renderTemplateFile(name: string, content: LoginEmailContent): string {
	const template = loadTemplate(name);
	const vars = buildTemplateVars(content);

	return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? "");
}

export function renderLoginNotificationHtml(content: LoginEmailContent): string {
	return renderTemplateFile("login-notification.html", content);
}

export function renderLoginNotificationText(content: LoginEmailContent): string {
	return renderTemplateFile("login-notification.txt", content);
}
