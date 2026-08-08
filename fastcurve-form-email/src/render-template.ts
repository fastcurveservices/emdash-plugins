import {
	formNotificationHtml,
	formNotificationText,
} from "./template-content.js";

const TEMPLATES: Record<string, string> = {
	"form-notification.html": formNotificationHtml,
	"form-notification.txt": formNotificationText,
};

export interface FormEmailContent {
	typeLabel: "Contact" | "Grievance";
	messageType: string;
	locale: string;
	senderName: string;
	senderEmail: string;
	subjectLine: string;
	message: string;
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

function buildTemplateVars(content: FormEmailContent): Record<string, string> {
	const isGrievance = content.messageType === "grievance";
	const name = siteName();
	const short = siteShort();

	return {
		siteName: escapeHtml(name),
		siteShort: escapeHtml(short),
		typeLabel: escapeHtml(content.typeLabel),
		typeLabelLower: escapeHtml(content.typeLabel.toLowerCase()),
		headerIntro: escapeHtml(
			`New ${content.typeLabel.toLowerCase()} form submission from the official website.`,
		),
		badgeColor: isGrievance ? "#9a3412" : "#1f6b3a",
		badgeBg: isGrievance ? "#fff7ed" : "#ecfdf3",
		messageAccentColor: isGrievance ? "#9a3412" : "#1f6b3a",
		locale: escapeHtml(content.locale.toUpperCase()),
		senderName: escapeHtml(content.senderName),
		senderEmail: escapeHtml(content.senderEmail),
		senderEmailHref: escapeAttr(content.senderEmail),
		subjectLine: escapeHtml(content.subjectLine || "—"),
		receivedAt: escapeHtml(content.receivedAt),
		message: escapeHtml(content.message),
		footerNote: escapeHtml(
			`This notification was generated automatically by the ${short} website contact system. Reply directly to the sender using the email address above.`,
		),
	};
}

export function renderTemplateFile(name: string, content: FormEmailContent): string {
	const template = loadTemplate(name);
	const vars = buildTemplateVars(content);

	return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? "");
}

export function renderFormNotificationHtml(content: FormEmailContent): string {
	return renderTemplateFile("form-notification.html", content);
}

export function renderFormNotificationText(content: FormEmailContent): string {
	return renderTemplateFile("form-notification.txt", content);
}
