export interface VisitorRecord {
	visitorKey: string;
	firstSeen: string;
	lastSeen: string;
	visitCount: number;
}

export interface VisitHit {
	timestamp: string;
	visitorKey: string;
	path: string;
}

export interface VisitInput {
	visitorKey: string;
	path: string;
}
