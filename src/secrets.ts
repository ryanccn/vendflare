const generateSecret = () => {
	const bytes = crypto.getRandomValues(new Uint8Array(64));
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

export const getSecret = (db: D1Database, userId: string) =>
	db.prepare('SELECT secret FROM secrets WHERE user_id = ?')
		.bind(userId)
		.first<{ secret: string }>()
		.then((row) => row?.secret);

export const getOrCreateSecret = (db: D1Database, userId: string) =>
	db.prepare('INSERT INTO secrets (user_id, secret) VALUES (?, ?) ON CONFLICT (user_id) DO UPDATE SET secret = secret RETURNING secret')
		.bind(userId, generateSecret())
		.first<{ secret: string }>()
		.then((row) => row!.secret);
