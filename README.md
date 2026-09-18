# Costa Rica Locations GraphQL

A GraphQL API serving Costa Rica's administrative divisions: **provincia → cantón → distrito**.

Built as a learning project — schema-first GraphQL with Apollo Server and
TypeScript, resolvers type-checked against the schema via
[GraphQL Code Generator](https://the-guild.dev/graphql/codegen).

## Data

`data/locations.json` — 7 provincias, 82 cantones, 474 distritos, each with a
stable `id` and `nombre`; distritos also carry a `codigoPostal`.

## Schema

See [`server/schema.graphql`](server/schema.graphql) for the source of
truth — not duplicated here so this doc can't drift out of sync with it.

## Run locally

```bash
cd server
npm install
npm run codegen   # generates generated/graphql.ts from schema.graphql
npm run dev       # runs index.ts directly via tsx, restarts on change
```

Opens Apollo Sandbox at `http://localhost:4000/`. Try:

```graphql
{
  provincia(id: "p1") {
    nombre
    cantones {
      nombre
      distritos { nombre }
    }
  }
}
```

## Type-checked resolvers (GraphQL Code Generator)

`npm run codegen` reads `schema.graphql` and generates
`generated/graphql.ts`: a `Resolvers<Context>` type covering every field in
the schema. `resolvers.ts` is typed against it, so a resolver with the wrong
return shape, a typo'd field name, or a missing arg fails `tsc`, not a live
query.

The generated types describe GraphQL *output* shapes (e.g. `Canton` includes
a resolved `distritos: Distrito[]`), but the actual data resolvers receive is
flat (`CantonModel` has `provinciaId: string`, not a resolved `Provincia`).
`codegen.ts` bridges this with `mappers`, pointing each GraphQL type at its
real parent shape in `models.ts` — a common pattern once resolvers stop
mirroring the schema 1:1.

Re-run `npm run codegen` after editing `schema.graphql`.

## Tests

```bash
npm run codegen   # resolvers.ts imports the generated types
npm test          # runs server/test/**/*.test.ts via node:test (through tsx)
```

Covers the `Query` resolvers' filtering/lookup behavior (including
`buscarDistrito`'s empty-query handling) and the `Canton`/`Provincia`/
`Distrito` field resolvers that stitch parents back together via the
mappers.

## Deploy (Render)

1. Push this repo to GitHub.
2. Render → New → Web Service → connect the repo.
3. Root directory: `server`
4. Build command: `npm install && npm run codegen && npm run build`
5. Start command: `npm start`
6. Deploy — Render assigns `PORT` automatically, the server reads it via
   `process.env.PORT`.

## Deploy (EC2)

Runs as a `systemd` service (`cr-locations.service`) behind nginx on the
instance, `git pull`-based deploys.

First-time setup on a fresh Ubuntu instance:

1. Install Node via [nvm](https://github.com/nvm-sh/nvm), install `git`
   (usually preinstalled).
2. `git clone` this repo, `cd server && npm ci && npm run codegen && npm run build`.
3. Create `/etc/systemd/system/cr-locations.service`:
   ```ini
   [Unit]
   Description=Costa Rica Locations GraphQL server
   After=network.target

   [Service]
   Type=simple
   User=ubuntu
   WorkingDirectory=/home/ubuntu/graphql-costa-rica-locations/server
   ExecStart=/home/ubuntu/.nvm/versions/node/v20.20.2/bin/node dist/index.js
   Restart=on-failure
   RestartSec=3
   Environment=PORT=4000

   [Install]
   WantedBy=multi-user.target
   ```
   (adjust the `node` path to match your installed version)
4. `sudo systemctl daemon-reload && sudo systemctl enable --now cr-locations`
5. Point nginx at it — `/etc/nginx/sites-available/cr-locations`:
   ```nginx
   server {
       listen 80;
       server_name _;

       location / {
           proxy_pass http://127.0.0.1:4000;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   `sudo ln -sf /etc/nginx/sites-available/cr-locations /etc/nginx/sites-enabled/`,
   remove the default site, `sudo nginx -t && sudo systemctl reload nginx`.
6. Security group: open 22 (your IP only) and 80 (anywhere).

Redeploying after a push: `./deploy.sh` (pulls, rebuilds, restarts the
service).
