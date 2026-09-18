import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { typeDefs } from "./schema.js";
import { resolvers } from "./resolvers.js";
import type { Context } from "./context.js";

// startStandaloneServer enables permissive (allow-all) CORS by default. Kept as-is:
// this API is public, read-only reference data with no auth/mutations, so there's
// no cross-origin data to protect. Locking origins down would require swapping to
// expressMiddleware with a custom `cors()` config.
//
// csrfPrevention is off for the same reason: it guards cookie-authenticated APIs
// against cross-site form-post attacks, but this API has no cookies/auth to protect,
// and the default was blocking the Sandbox's own introspection requests when loaded
// from a plain IP address (no matching Origin header for Apollo to trust).
const server = new ApolloServer<Context>({ typeDefs, resolvers, csrfPrevention: false });

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

const { url } = await startStandaloneServer(server, {
  listen: { port, host: "0.0.0.0" },
});

console.log(`GraphQL server ready at ${url}`);
