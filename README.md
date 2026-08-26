# Costa Rica Locations GraphQL

A GraphQL API serving Costa Rica's administrative divisions: **provincia → cantón → distrito**.

Built as a learning project — schema-first GraphQL with Apollo Server, deployed
on [Render](https://render.com).

## Data

`data/locations.json` — 7 provincias, 82 cantones, 474 distritos, each with a
stable `id` and `nombre`. Derived from a [2018 public dataset](https://gist.github.com/richin13/7fc95f2e433c2f46335ef02d959b0561)
via `scripts/build-data.py` (some districts created after 2018 are not included).

## Schema

```graphql
type Provincia {
  id: ID!
  nombre: String!
  cantones: [Canton!]!
}

type Canton {
  id: ID!
  nombre: String!
  provincia: Provincia!
  distritos: [Distrito!]!
}

type Distrito {
  id: ID!
  nombre: String!
  canton: Canton!
}

type Query {
  provincias: [Provincia!]!
  provincia(id: ID!): Provincia
  cantones(provinciaId: ID): [Canton!]!
  canton(id: ID!): Canton
  distritos(cantonId: ID): [Distrito!]!
  buscarDistrito(nombre: String!): [Distrito!]!
}
```

## Run locally

```bash
cd server
npm install
npm start
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

## Deploy (Render)

1. Push this repo to GitHub.
2. Render → New → Web Service → connect the repo.
3. Root directory: `server`
4. Build command: `npm install`
5. Start command: `npm start`
6. Deploy — Render assigns `PORT` automatically, the server reads it via
   `process.env.PORT`.
