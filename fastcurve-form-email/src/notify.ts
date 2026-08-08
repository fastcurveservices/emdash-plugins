import type { EmailMessage } from "emdash";
import { renderFormNotificationHtml, renderFormNotificationText } from "./render-template.js";
import { resolveFormNotifyTo } from "./smtp-secrets.js";

interface ContactMessageData {
	message_type?: string;
	title?: string;
	sender_name?: string;
	email?: string;
	subject?: string;
	message?: string;
	source_locale?: string;
}

function field(data: ContactMessageData, key: keyof ContactMessageData): string {
	const value = data[key];
	return typeof value === "string" ? value : "";
}

function formatReceivedAt(): string {
	return new Intl.DateTimeFormat("en-IN", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "Asia/Kolkata",
	}).format(new Date());
}

export function buildFormNotificationEmail(
	data: ContactMessageData,
): EmailMessage | null {
	const notifyTo = resolveFormNotifyTo();
	if (!notifyTo) return null;

	const messageType = field(data, "message_type") || "contact";
	const typeLabel = messageType === "grievance" ? "Grievance" : "Contact";
	const senderName = field(data, "sender_name");
	const senderEmail = field(data, "email");
	const subjectLine = field(data, "subject");
	const title = field(data, "title");
	const message = field(data, "message");
	const locale = field(data, "source_locale") || "en";
	const receivedAt = formatReceivedAt();

	const siteShort = process.env.SITE_SHORT?.trim() || "Site";
	const emailSubject =
		subjectLine.trim() !== ""
			? `[${siteShort} ${typeLabel}] ${subjectLine}`
			: `[${siteShort} ${typeLabel}] ${title || senderName || "New submission"}`;

	const text = renderFormNotificationText({
		typeLabel,
		messageType,
		locale,
		senderName,
		senderEmail,
		subjectLine,
		message,
		receivedAt,
	});

	const html = renderFormNotificationHtml({
		typeLabel,
		messageType,
		locale,
		senderName,
		senderEmail,
		subjectLine,
		message,
		receivedAt,
	});

	return {
		to: notifyTo,
		subject: emailSubject,
		text,
		html,
	};
}
