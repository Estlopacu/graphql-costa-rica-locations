import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { typeDefs } from "./schema.js";
import { resolvers } from "./resolvers.js";

const server = new ApolloServer({ typeDefs, resolvers });

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

const { url } = await startStandaloneServer(server, {
  listen: { port, host: "0.0.0.0" },
});

console.log(`GraphQL server ready at ${url}`);
