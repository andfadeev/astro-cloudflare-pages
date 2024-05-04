import { Lucia } from "lucia";
import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import { drizzle } from "drizzle-orm/d1";
import { sessionTable, userTable } from "@db/schema";

import { GitHub } from "arctic";

export function initializeGithubClient(env: Env) {
  return new GitHub(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET);
}

export function initializeLucia(D1: D1Database) {
  const db = drizzle(D1);
  const adapter = new DrizzleSQLiteAdapter(db, sessionTable, userTable);
  return new Lucia(adapter, {
    sessionCookie: {
      attributes: {
        secure: false,
      },
    },
    getUserAttributes: (attributes) => {
      return {
        githubId: attributes.githubId,
        username: attributes.username,
      };
    },
  });
}

interface DatabaseUserAttributes {
  githubId: number;
  username: string;
}

declare module "lucia" {
  interface Register {
    Lucia: ReturnType<typeof initializeLucia>;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}
