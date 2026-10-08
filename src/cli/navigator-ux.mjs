#!/usr/bin/env node
// The `navigator-ux` bin. Everything it does is in `check.mjs`, where a test can reach it.
import { main } from './check.mjs'

process.exitCode = await main(process.argv.slice(2), {
  out: (line) => process.stdout.write(`${line}\n`),
  err: (line) => process.stderr.write(`${line}\n`),
})
