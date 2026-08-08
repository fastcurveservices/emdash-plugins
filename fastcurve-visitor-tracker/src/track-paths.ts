const STATIC_EXT =
	/\.(?:css|js|mjs|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|pdf|zip|xml|txt|json|webmanifest)$/i;

/** Whether a public site request should be counted as a page visit. */
export function shouldTrackVisit(pathname: string, method: string): boolean {
	if (method !== "GET") return false;
	if (!pathname.startsWith("/")) return false;
	if (pathname.startsWith("/_emdash/")) return false;
	if (pathname.startsWith("/api/")) return false;
	if (STATIC_EXT.test(pathname)) return false;
	return true;
}
