import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const typeDefs = readFileSync(path.join(__dirname, "schema.graphql"), "utf-8");
