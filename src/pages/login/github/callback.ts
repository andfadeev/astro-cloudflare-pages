import { initializeLucia, initializeGithubClient } from "@lib/auth";
import { OAuth2RequestError } from "arctic";
import { generateIdFromEntropySize } from "lucia";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "@db/schema";

import type { APIContext } from "astro";

export async function GET(context: APIContext): Promise<Response> {
  const github = initializeGithubClient(context.locals.runtime.env);
  const lucia = initializeLucia(context.locals.runtime.env.DB);
  const db = drizzle(context.locals.runtime.env.DB, { schema });
  const code = context.url.searchParams.get("code");
  const state = context.url.searchParams.get("state");
  const storedState = context.cookies.get("github_oauth_state")?.value ?? null;
  if (!code || !state || !storedState || state !== storedState) {
    return new Response(null, {
      status: 400,
    });
  }

  try {
    const tokens = await github.validateAuthorizationCode(code);
    const githubUserResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "User-Agent": "astro-cloudflare-pages",
      },
    });
    const githubUser: GitHubUser = await githubUserResponse.json();

    const existingUser = await db.query.userTable.findFirst({
      where: eq(schema.userTable.githubId, parseInt(githubUser.id)),
    });

    if (existingUser) {
      const session = await lucia.createSession(existingUser.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      context.cookies.set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes,
      );
      return context.redirect("/");
    }

    const userId = generateIdFromEntropySize(10);

    await db.insert(schema.userTable).values({
      id: userId,
      githubId: parseInt(githubUser.id),
      username: githubUser.login,
    });

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    context.cookies.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    );
    return context.redirect("/");
  } catch (e) {
    // the specific error message depends on the provider
    if (e instanceof OAuth2RequestError) {
      // invalid code
      return new Response(null, {
        status: 400,
      });
    }
    return new Response(null, {
      status: 500,
    });
  }
}

interface GitHubUser {
  id: string;
  login: string;
}
