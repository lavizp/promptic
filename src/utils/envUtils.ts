import { envStore } from "../config/envConfig/envConfig.ts";

export function fillEnvValue({ key, value }: { key: string, value: string }) {
  envStore.set(key, value)
}
