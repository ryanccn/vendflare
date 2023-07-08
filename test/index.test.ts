import { expect, test } from "vitest";

import worker from "@dist/worker";

import { makeUrl } from "./utils";

test("returns default redirect", async () => {
	const res = await worker.fetch(new Request(makeUrl("/"), { redirect: "manual" }), {});

	expect(res.status).toEqual(302);
	expect(res.headers.get("location")).toEqual("https://vencord.dev/");
});

test("returns custom redirect", async () => {
	const res = await worker.fetch(new Request(makeUrl("/"), { redirect: "manual" }), {
		ROOT_REDIRECT: "https://ryanccn.dev/",
	});

	expect(res.status).toEqual(302);
	expect(res.headers.get("location")).toEqual("https://ryanccn.dev/");
});

test("ping pong", async () => {
	const res = await worker.fetch(new Request(makeUrl("/v1")));
	expect(res.ok).toEqual(true);

	const data = await res.json();
	expect(data).toEqual({ ping: "pong" });
});

test("x-powered-by header", async () => {
	const res = await worker.fetch(new Request(makeUrl("/v1")));
	expect(res.ok).toEqual(true);
	expect(res.headers.get("x-powered-by")).toMatch(/^vendflare@[a-zA-Z0-9]+$/);
});
