/** EmDash auth API paths that should produce login/logout audit entries. */
export const AUTH_AUDIT_PATHS = {
	login: [
		"/_emdash/api/auth/passkey/verify",
		"/_emdash/api/auth/dev-bypass",
	],
	logout: "/_emdash/api/auth/logout",
} as const;

const LOGIN_PREFIXES = [
	"/_emdash/api/auth/magic-link/",
	"/_emdash/api/auth/oauth/",
] as const;

export function isAuthAuditPath(pathname: string, method: string): boolean {
	const normalizedMethod = method.toUpperCase();

	if (pathname === AUTH_AUDIT_PATHS.logout && normalizedMethod === "POST") {
		return true;
	}

	if (
		pathname === "/_emdash/api/auth/dev-bypass" &&
		(normalizedMethod === "POST" || normalizedMethod === "GET")
	) {
		return true;
	}

	if (normalizedMethod !== "POST") return false;

	if (AUTH_AUDIT_PATHS.login.includes(pathname as (typeof AUTH_AUDIT_PATHS.login)[number])) {
		return true;
	}

	return LOGIN_PREFIXES.some(
		(prefix) => pathname.startsWith(prefix) && (pathname.endsWith("/verify") || pathname.endsWith("/callback")),
	);
}

export function authActionForPath(pathname: string): "login" | "logout" | "login_failed" {
	if (pathname === AUTH_AUDIT_PATHS.logout) return "logout";
	return "login";
}
