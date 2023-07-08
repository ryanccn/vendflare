import { expect, test } from "vitest";

import worker from "@dist/worker";

import { getTestingKV, makeUrl } from "./utils";

test("correct secret results in success", async () => {
	const KV = await getTestingKV({ initializeUser: true });

	const res = await worker.fetch(
		new Request(makeUrl("/v1/"), { method: "DELETE", headers: { Authorization: btoa("bleh:TESTING_USER") } }),
		{ KV }
	);

	expect(res.ok).toEqual(true);
});

test("incorrect secret results in success", async () => {
	const KV = await getTestingKV({ initializeUser: true });

	const res = await worker.fetch(
		new Request(makeUrl("/v1/"), { method: "DELETE", headers: { Authorization: btoa("not_bleh:TESTING_USER") } }),
		{ KV }
	);

	expect(res.ok).toEqual(false);
	expect(res.status).toEqual(401);
});
