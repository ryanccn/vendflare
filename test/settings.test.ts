import { expect, test } from "vitest";

import worker from "@dist/worker";

import { deflateSync, inflateSync } from "fflate";

import { makeUrl, getTestingKV } from "./utils";

test("unauthorized settings access is forbidden", async () => {
	const KV = await getTestingKV({ initializeUser: true });

	const res = await worker.fetch(new Request(makeUrl("/v1/settings"), { method: "GET", headers: {} }), { KV });

	expect(res.status).toEqual(401);
});

test("empty settings returns 404", async () => {
	const KV = await getTestingKV({ initializeUser: true });

	const res = await worker.fetch(
		new Request(makeUrl("/v1/settings"), { method: "GET", headers: { authorization: btoa("bleh:TESTING_USER") } }),
		{ KV },
	);

	expect(res.status).toEqual(404);
});

test("settings are saved", async () => {
	const KV = await getTestingKV({ initializeUser: true });

	const putRes = await worker.fetch(
		new Request(makeUrl("/v1/settings"), {
			method: "PUT",
			body: deflateSync(new TextEncoder().encode(JSON.stringify({ test: "data" }))),
			headers: { "content-type": "application/octet-stream", "authorization": btoa("bleh:TESTING_USER") },
		}),
		{ KV },
	);

	expect(putRes.ok).toEqual(true);

	const getRes = await worker.fetch(
		new Request(makeUrl("/v1/settings"), {
			method: "GET",
			headers: { authorization: btoa("bleh:TESTING_USER") },
		}),
		{ KV },
	);

	expect(getRes.ok).toEqual(true);

	const data = JSON.parse(new TextDecoder().decode(inflateSync(new Uint8Array(await getRes.arrayBuffer()))));

	expect(data).toEqual({ test: "data" });
});

test("size limit is enforced", async () => {
	const KV = await getTestingKV({ initializeUser: true });

	const putRes = await worker.fetch(
		new Request(makeUrl("/v1/settings"), {
			method: "PUT",
			body: deflateSync(new TextEncoder().encode(JSON.stringify({ test: "data" }))),
			headers: { "content-type": "application/octet-stream", "authorization": btoa("bleh:TESTING_USER") },
		}),
		{ KV, SIZE_LIMIT: 1 },
	);

	expect(putRes.status).toEqual(413);
});

test("content-type is enforced", async () => {
	const KV = await getTestingKV({ initializeUser: true });

	const putRes = await worker.fetch(
		new Request(makeUrl("/v1/settings"), {
			method: "PUT",
			body: "bleh",
			headers: { "content-type": "text/plain; encoding=utf-8", "authorization": btoa("bleh:TESTING_USER") },
		}),
		{ KV },
	);

	expect(putRes.status).toEqual(400);
});

test("if-none-match header is observed", async () => {
	const KV = await getTestingKV({ initializeUser: true });

	const putRes = await worker.fetch(
		new Request(makeUrl("/v1/settings"), {
			method: "PUT",
			body: deflateSync(new TextEncoder().encode(JSON.stringify({ test: "data" }))),
			headers: { "content-type": "application/octet-stream", "Authorization": btoa("bleh:TESTING_USER") },
		}),
		{ KV },
	);

	expect(putRes.ok).toEqual(true);

	const { written } = (await putRes.json()) as { written: number };

	const getRes = await worker.fetch(
		new Request(makeUrl("/v1/settings"), {
			method: "GET",
			headers: { "authorization": btoa("bleh:TESTING_USER"), "if-none-match": `${written}` },
		}),
		{ KV },
	);

	expect(getRes.status).toEqual(304);

	const getRes2 = await worker.fetch(
		new Request(makeUrl("/v1/settings"), {
			method: "GET",
			headers: { "authorization": btoa("bleh:TESTING_USER"), "if-none-match": `${written + 1}` },
		}),
		{ KV },
	);

	expect(getRes2.status).toEqual(200);
});

test("settings are deleted", async () => {
	const KV = await getTestingKV({ initializeUser: true });

	const putRes = await worker.fetch(
		new Request(makeUrl("/v1/settings"), {
			method: "PUT",
			body: deflateSync(new TextEncoder().encode(JSON.stringify({ test: "data" }))),
			headers: { "content-type": "application/octet-stream", "authorization": btoa("bleh:TESTING_USER") },
		}),
		{ KV },
	);

	expect(putRes.status).toEqual(200);

	const getRes = await worker.fetch(
		new Request(makeUrl("/v1/settings"), {
			method: "DELETE",
			headers: { authorization: btoa("bleh:TESTING_USER") },
		}),
		{ KV },
	);

	expect(getRes.status).toEqual(204);

	const checkRes = await worker.fetch(
		new Request(makeUrl("/v1/settings"), {
			method: "GET",
			headers: { authorization: btoa("bleh:TESTING_USER") },
		}),
		{ KV },
	);

	expect(checkRes.status).toEqual(404);
});
