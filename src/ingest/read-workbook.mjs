// Read an XLSX workbook into raw rows with sheet and row references.
// Interpretation and normalization live in map-sources.mjs — this file only reads.

import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import XLSX from "xlsx"

export async function readWorkbook(xlsxPath) {
  const path = resolve(xlsxPath)
  let data
  try {
    data = await readFile(path)
  } catch (err) {
    return { error: true, code: "E_READ_XLSX", message: `Cannot read workbook ${xlsxPath}: ${err.message}` }
  }

  let workbook
  try {
    workbook = XLSX.read(data, { type: "buffer" })
  } catch (err) {
    return { error: true, code: "E_PARSE_XLSX", message: `Workbook is not readable as XLSX: ${err.message}` }
  }

  if (!workbook.SheetNames?.length) {
    return { error: true, code: "E_EMPTY_XLSX", message: "Workbook contains no sheets." }
  }

  const sheets = workbook.SheetNames.map((name) => {
    const ws = workbook.Sheets[name]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: true })
    const rawRows = rows.map((raw, i) => ({
      sheet: name,
      rowIndex: i + 1, // 1-based, matches what a human sees in Excel
      raw,
    }))
    return {
      name,
      range: ws["!ref"] ?? null,
      merges: (ws["!merges"] ?? []).length,
      rawRows,
    }
  })

  return { error: false, sheets, totalSheets: sheets.length }
}
