import * as kvBackend from "./kv";
import * as doBackend from "./do";

import { userDataKeys, type UserDataType } from "./types";
import type { Env } from "~/env";

export class UserDataStore {
	env: Env;
	userId: string;

	kv?: KVNamespace;
	do?: DurableObjectNamespace;

	constructor(env: Env, userId: string) {
		this.env = env;
		this.userId = userId;

		durable: if (env.USER_DATA) {
			this.do = env.USER_DATA;
		}

		kv: if (env.KV) {
			this.kv = env.KV;
		}

		if (!this.do && !this.kv) {
			throw new Error("No supported storage backends found!");
		}
	}

	isKV(): this is { kv: KVNamespace } {
		return !!this.kv;
	}
	isDO(): this is { do: DurableObjectNamespace } {
		return !!this.do;
	}

	#getUserDurableObject() {
		if (!this.isDO()) throw new Error("Backend is not Durable Objects");
		return this.do.get(this.do.idFromName(this.userId));
	}

	async get<K extends keyof UserDataType>(key: K): Promise<UserDataType[K] | null> {
		durable: if (this.isDO()) {
			const obj = this.#getUserDurableObject();
			return doBackend.get(obj, key);
		}

		kv: if (this.isKV()) {
			return kvBackend.get(this.kv, this.userId, key);
		}

		throw new Error("No supported storage backends found!");
	}

	async put<K extends keyof UserDataType>(key: K, value: UserDataType[K]) {
		durable: if (this.isDO()) {
			const obj = this.#getUserDurableObject();
			await doBackend.put(obj, key, value);
			return;
		}

		kv: if (this.isKV()) {
			await kvBackend.put(this.kv, this.userId, key, value);
			return;
		}

		throw new Error("No supported storage backends found!");
	}

	async del<K extends keyof UserDataType>(key: K) {
		durable: if (this.isDO()) {
			const obj = this.#getUserDurableObject();
			await doBackend.del(obj, key);
			return;
		}

		kv: if (this.isKV()) {
			await kvBackend.del(this.kv, this.userId, key);
			return;
		}

		throw new Error("No supported storage backends found!");
	}

	async delAll() {
		durable: if (this.isDO()) {
			const obj = this.#getUserDurableObject();
			await doBackend.delAll(obj);
			return;
		}

		kv: if (this.isKV()) {
			for (const key of userDataKeys) {
				await kvBackend.del(this.kv, this.userId, key);
			}
			return;
		}

		throw new Error("No supported storage backends found!");
	}
}
