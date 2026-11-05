import { readFile, writeFile } from "node:fs/promises"
import { pathToFileURL } from "node:url"
import { runEngine } from "./index.mjs"

function parseArgs(argv) {
  const args = {}
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--input") args.input = argv[++index]
    else if (arg === "--assignments") args.assignments = argv[++index]
    else if (arg === "--out") args.out = argv[++index]
    else if (arg === "--max-search-nodes") args.maxSearchNodes = Number(argv[++index])
    else if (arg === "--help" || arg === "-h") args.help = true
    else throw new Error(`Unknown option: ${arg}`)
  }
  return args
}

const usage = `Usage: node src/engine/cli.mjs --input <canonical.json> --assignments <teacher-map.json> [--out <result.json>] [--max-search-nodes <count>]

The assignments JSON shape is { "teacherBySubject": { "<subject-id>": "<teacher-id>" } }.
Exit codes: 0 complete, 1 blocked/unschedulable, 2 invalid input or CLI error.`

export async function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv)
  if (args.help) {
    process.stdout.write(`${usage}\n`)
    return 0
  }
  if (!args.input) throw new Error("--input is required")
  const canonical = JSON.parse(await readFile(args.input, "utf8"))
  const assignments = args.assignments
    ? JSON.parse(await readFile(args.assignments, "utf8"))
    : {}
  const result = runEngine(canonical, {
    ...assignments,
    maxSearchNodes: args.maxSearchNodes,
  })
  const serialized = `${JSON.stringify(result, null, 2)}\n`
  if (args.out) await writeFile(args.out, serialized)
  else process.stdout.write(serialized)
  return result.status === "complete" ? 0
    : result.status === "invalid-input" ? 2 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().then((code) => {
    process.exitCode = code
  }).catch((error) => {
    process.stderr.write(`${error.message}\n`)
    process.stderr.write(`${usage}\n`)
    process.exitCode = 2
  })
}
