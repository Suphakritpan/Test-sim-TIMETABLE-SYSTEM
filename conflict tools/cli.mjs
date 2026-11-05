#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { validateSchedule } from "./validate.mjs";

function usage() {
  console.error("Usage: node \"conflict tools/cli.mjs\" <schedule.json> [--json]");
}

const args = process.argv.slice(2);
const jsonOutput = args.includes("--json");
const inputPath = args.find((arg) => arg !== "--json");

if (!inputPath) {
  usage();
  process.exitCode = 2;
} else {
  try {
    const data = JSON.parse(await readFile(inputPath, "utf8"));
    const report = validateSchedule(data);
    if (jsonOutput) {
      console.log(JSON.stringify(report, null, 2));
    } else if (report.violations.length === 0) {
      console.log("Schedule is conflict-free.");
    } else {
      console.log(`Schedule has ${report.violationCount} hard violation(s) and ${report.errorCount} input error(s).`);
      for (const item of report.violations) {
        const slots = item.slots.map(({ day, period }) => `${day} P${period}`).join(", ");
        const entities = item.entityIds.length ? ` [${item.entityIds.join(", ")}]` : "";
        console.log(`${item.ruleId}: ${item.message}${entities}${slots ? ` — ${slots}` : ""}`);
      }
    }
    if (report.errorCount > 0) process.exitCode = 2;
    else if (report.violationCount > 0) process.exitCode = 1;
  } catch (error) {
    console.error(`Unable to read or parse ${inputPath}: ${error.message}`);
    process.exitCode = 2;
  }
}
