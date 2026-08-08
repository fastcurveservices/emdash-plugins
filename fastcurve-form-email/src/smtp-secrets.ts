function readEnv(name: string): string | undefined {
	const value = process.env[name]?.trim();
	return value || undefined;
}

export function resolveFormNotifyTo(): string | undefined {
	return readEnv("FORM_NOTIFY_TO") ?? readEnv("SMTP_TO");
}
