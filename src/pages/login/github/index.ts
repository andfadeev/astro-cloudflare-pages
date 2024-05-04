import { generateState } from "arctic";
import { initializeGithubClient } from "@lib/auth";

import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
  const github = initializeGithubClient(context.locals.runtime.env);
  const state = generateState();
  const url = await github.createAuthorizationURL(state);

  context.cookies.set("github_oauth_state", state, {
    path: "/",
    secure: import.meta.env.PROD,
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "lax",
  });

  return context.redirect(url.toString());
}
