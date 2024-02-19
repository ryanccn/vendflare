import { type Context } from 'hono';
import { startTime as honoStartTime, endTime as honoEndTime } from 'hono/timing';

const timingLabels = {
	auth: 'Authentication',
	readSettings: 'Read settings',
	compressData: 'Compress data',
	receiveBuffer: 'Receive buffer',
	decompressData: 'Decompress data',
	writeSettings: 'Write settings',
	deleteSettings: 'Delete settings',
	deleteData: 'Delete data',
	obtainDiscordToken: 'Obtain Discord token',
	fetchUserInfo: 'Fetch user information',
	getSecret: 'Attempt to get secret',
	generateSecret: 'Generate secret',
} as const;

export const startTime = <T extends keyof typeof timingLabels>(ctx: Context, name: T) => {
	honoStartTime(ctx, name, timingLabels[name]);
};

export const endTime = <T extends keyof typeof timingLabels>(ctx: Context, name: T) => {
	honoEndTime(ctx, name);
};
