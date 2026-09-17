import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "schema.graphql",
  generates: {
    "generated/graphql.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        useIndexSignature: true,
        contextType: "../context.js#Context",
        mappers: {
          Provincia: "../models.js#ProvinciaModel",
          Canton: "../models.js#CantonModel",
          Distrito: "../models.js#DistritoModel",
        },
      },
    },
  },
};

export default config;
