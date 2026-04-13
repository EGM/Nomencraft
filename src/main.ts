// src/main.ts
// Entrypoint for the Batch Rename CLI.

import { cli } from "./utils/cli.ts";

await cli.parse(Deno.args);
