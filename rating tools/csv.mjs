import { readFile } from "node:fs/promises";

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === "") {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted field.");
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => header.trim());
  if (headers.some((header) => !header)) throw new Error("CSV contains an empty column name.");
  if (new Set(headers).size !== headers.length) throw new Error("CSV contains duplicate column names.");

  return rows.slice(1).filter((cells) => cells.some((cell) => cell.trim() !== ""))
    .map((cells, index) => {
      if (cells.length !== headers.length) {
        throw new Error(`CSV row ${index + 2} has ${cells.length} columns; expected ${headers.length}.`);
      }
      return Object.fromEntries(headers.map((header, column) => [header, cells[column]]));
    });
}

export function stringifyCsvRow(values) {
  return values.map((value) => {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }).join(",");
}

export async function readCsv(path) {
  return parseCsv(await readFile(path, "utf8"));
}
