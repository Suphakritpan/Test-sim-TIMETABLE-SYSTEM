// Reusable ingest core entry point.
// The CLI and any future Express route call the same `ingest` function, so the logic
// runs locally with no server, browser, network or database.

export { ingest, DEFAULT_EXPECTED, OPEN_QUESTIONS } from "./cli.mjs"
export { schemaVersion, allowedDays, lunchAllowedPeriods, roleBands, roomClassPermits } from "./schema.mjs"
export { validateIngestPackage } from "./validate-input.mjs"
export { renderMarkdown } from "./write-package.mjs"
