import { Hono } from "hono";
import { cors } from 'hono/cors'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

import { connect, clickhouse } from './db.ts'
import { insert } from "./batchInsert.ts";

const hono = new Hono();
hono.use(cors());

hono.post('/loki/api/v1/push',
  zValidator('json', z.object({
    streams: z.array(z.object({
      stream: z.object({
        source: z.string(),
        level: z.string(),
        modVersion: z.string(),
        region: z.string(),
      }),
      values: z.array(z.tuple([z.string(), z.string(), z.object({
        playerName: z.string(),
        gameVersion: z.string(),
        session: z.string(),
      })])),
    })),
  }),
    async (result, c) => {

      if (!result.success) {
        return c.text('Invalid request' + result.error, 400);
      }

      const { streams } = result.data;

      insert('logs', streams.flatMap(stream =>
        stream.values.map(v => ({
          source: stream.stream.source,
          time: v[0],
          level: stream.stream.level,
          region: stream.stream.region,
          playerName: v[2].playerName,
          gameVersion: v[2].gameVersion,
          modVersion: stream.stream.modVersion,
          session: v[2].session,
          message: v[1],
        }))))

      return c.text('OK');
    })
);


if (!await connect({ timeout: 10 })) {
  throw new Error('ClickHouse is not available')
}

await clickhouse.exec({
  query: `
  create table if not exists logs (
    source LowCardinality(String),
    time DateTime64(9),
    level LowCardinality(String),
    region LowCardinality(String),
    playerName String,
    gameVersion LowCardinality(String),
    modVersion LowCardinality(String),
    session String,
    message String
  )
  engine = MergeTree()
  order by time
  TTL time + INTERVAL 3 DAY
  `})

console.log(`Server is listening on port ${Bun.env.PORT}`);


export default {
  port: Bun.env.PORT,
  fetch: hono.fetch,
}
