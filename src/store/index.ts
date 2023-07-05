import * as kvBackend from "./kv";
import * as doBackend from "./do";
import * as upstashBackend from "./upstash";

import { userDataKeys, type UserDataType } from "./types";
import type { Env } from "~/env";

export class UserDataStore {
	env: Env;
	userId: string;

	kv?: KVNamespace;
	do?: DurableObjectNamespace;
	upstash?: upstashBackend.UpstashConfig;

	constructor(env: Env, userId: string) {
		this.env = env;
		this.userId = userId;

		if ((!VENDFLARE_SINGLE_BACKEND || VENDFLARE_SINGLE_BACKEND === "do") && env.USER_DATA) {
			this.do = env.USER_DATA;
		} else if ((!VENDFLARE_SINGLE_BACKEND || VENDFLARE_SINGLE_BACKEND === "kv") && env.KV) {
			this.kv = env.KV;
		} else if (
			(!VENDFLARE_SINGLE_BACKEND || VENDFLARE_SINGLE_BACKEND === "upstash") &&
			env.UPSTASH_REDIS_REST_URL &&
			env.UPSTASH_REDIS_REST_TOKEN
		) {
			this.upstash = {
				url: env.UPSTASH_REDIS_REST_URL,
				token: env.UPSTASH_REDIS_REST_TOKEN,
			};
		} else {
			throw new Error("No supported storage backends found!");
		}
	}

	isKV(): this is { kv: KVNamespace } {
		return !!this.kv;
	}
	isDO(): this is { do: DurableObjectNamespace } {
		return !!this.do;
	}
	isUpstash(): this is { upstash: upstashBackend.UpstashConfig } {
		return !!this.upstash;
	}

	#getUserDurableObject() {
		if (!this.isDO()) throw new Error("Backend is not Durable Objects");
		return this.do.get(this.do.idFromName(this.userId));
	}

	async get<K extends keyof UserDataType>(key: K): Promise<UserDataType[K] | null> {
		if ((!VENDFLARE_SINGLE_BACKEND || VENDFLARE_SINGLE_BACKEND === "do") && this.isDO()) {
			const obj = this.#getUserDurableObject();
			return doBackend.get(obj, key);
		} else if ((!VENDFLARE_SINGLE_BACKEND || VENDFLARE_SINGLE_BACKEND === "kv") && this.isKV()) {
			return kvBackend.get(this.kv, this.userId, key);
		} else if ((!VENDFLARE_SINGLE_BACKEND || VENDFLARE_SINGLE_BACKEND === "upstash") && this.isUpstash()) {
			return upstashBackend.get(this.upstash, this.userId, key);
		} else {
			throw new Error("No supported storage backends found!");
		}
	}

	async put<K extends keyof UserDataType>(key: K, value: UserDataType[K]) {
		if ((!VENDFLARE_SINGLE_BACKEND || VENDFLARE_SINGLE_BACKEND === "do") && this.isDO()) {
			const obj = this.#getUserDurableObject();
			await doBackend.put(obj, key, value);
			return;
		} else if ((!VENDFLARE_SINGLE_BACKEND || VENDFLARE_SINGLE_BACKEND === "kv") && this.isKV()) {
			await kvBackend.put(this.kv, this.userId, key, value);
			return;
		} else if ((!VENDFLARE_SINGLE_BACKEND || VENDFLARE_SINGLE_BACKEND === "upstash") && this.isUpstash()) {
			return upstashBackend.put(this.upstash, this.userId, key, value);
		} else {
			throw new Error("No supported storage backends found!");
		}
	}

	async del<K extends keyof UserDataType>(key: K) {
		if ((!VENDFLARE_SINGLE_BACKEND || VENDFLARE_SINGLE_BACKEND === "do") && this.isDO()) {
			const obj = this.#getUserDurableObject();
			await doBackend.del(obj, key);
		} else if ((!VENDFLARE_SINGLE_BACKEND || VENDFLARE_SINGLE_BACKEND === "kv") && this.isKV()) {
			await kvBackend.del(this.kv, this.userId, key);
		} else if ((!VENDFLARE_SINGLE_BACKEND || VENDFLARE_SINGLE_BACKEND === "upstash") && this.isUpstash()) {
			return upstashBackend.del(this.upstash, this.userId, key);
		} else {
			throw new Error("No supported storage backends found!");
		}
	}

	async delAll() {
		if ((!VENDFLARE_SINGLE_BACKEND || VENDFLARE_SINGLE_BACKEND === "do") && this.isDO()) {
			const obj = this.#getUserDurableObject();
			await doBackend.delAll(obj);
		} else if ((!VENDFLARE_SINGLE_BACKEND || VENDFLARE_SINGLE_BACKEND === "kv") && this.isKV()) {
			for (const key of userDataKeys) {
				await kvBackend.del(this.kv, this.userId, key);
			}
		} else if ((!VENDFLARE_SINGLE_BACKEND || VENDFLARE_SINGLE_BACKEND === "upstash") && this.isUpstash()) {
			for (const key of userDataKeys) {
				await upstashBackend.del(this.upstash, this.userId, key);
			}
		} else {
			throw new Error("No supported storage backends found!");
		}
	}
}
