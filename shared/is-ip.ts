const IPV4_RE =
	/^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

const IPV6_RE =
	/^(?:[\da-f]{1,4}:){7}[\da-f]{1,4}$|^(?:[\da-f]{1,4}:){1,7}:$|^(?:[\da-f]{1,4}:){1,6}:[\da-f]{1,4}$|^(?:[\da-f]{1,4}:){1,5}(?::[\da-f]{1,4}){1,2}$|^(?:[\da-f]{1,4}:){1,4}(?::[\da-f]{1,4}){1,3}$|^(?:[\da-f]{1,4}:){1,3}(?::[\da-f]{1,4}){1,4}$|^(?:[\da-f]{1,4}:){1,2}(?::[\da-f]{1,4}){1,5}$|^[\da-f]{1,4}:(?::[\da-f]{1,4}){1,6}$|^:(?::[\da-f]{1,4}){1,7}$|^::(?:ffff(?::0{1,4})?:)?(?:(?:25[0-5]|(?:2[0-4]|1?\d)?\d)\.){3}(?:25[0-5]|(?:2[0-4]|1?\d)?\d)$/i;

export function isIPv4(value: string): boolean {
	return IPV4_RE.test(value);
}

export function isIPv6(value: string): boolean {
	return IPV6_RE.test(value);
}

export function ipKind(value: string): 4 | 6 | 0 {
	if (isIPv4(value)) return 4;
	if (isIPv6(value)) return 6;
	return 0;
}
