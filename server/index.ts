import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import depthLimit from "graphql-depth-limit";
import { typeDefs } from "./schema.js";
import { resolvers } from "./resolvers.js";
import type { Context } from "./context.js";

// startStandaloneServer enables permissive (allow-all) CORS by default. Kept as-is:
// this API is public, read-only reference data with no auth/mutations, so there's
// no cross-origin data to protect. Locking origins down would require swapping to
// expressMiddleware with a custom `cors()` config.
//
// csrfPrevention stays on (the default) — with CORS wide open, disabling it would
// let any third-party page fire arbitrary GraphQL operations from a visitor's
// browser with no preflight, which combined with the Provincia/Canton/Distrito
// schema cycle below would be a cheap DoS amplification vector.
//
// The depth limit caps that same cycle (Provincia -> cantones -> distritos ->
// canton -> distritos -> ...), which a client could otherwise nest arbitrarily
// deep in a single query.
const server = new ApolloServer<Context>({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(10)],
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

const { url } = await startStandaloneServer(server, {
  listen: { port, host: "0.0.0.0" },
});

console.log(`GraphQL server ready at ${url}`);
