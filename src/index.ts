import { h, scheduled } from "./api";
import { Env } from "./types";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return h.fetch(request, env, ctx);
  },

  async scheduled(env: Env): Promise<void> {
    await scheduled(env);
  },
};
