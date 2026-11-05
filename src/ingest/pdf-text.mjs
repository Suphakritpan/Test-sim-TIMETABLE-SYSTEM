// Extract guideline PDF text with the system `pdftotext -layout`.
// No shell interpolation of user paths; a failed extraction is a blocking error,
// never an empty rule set.

import { execFile } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

// Phrases the reviewed rule mapping depends on. If these are missing the extraction
// is wrong (wrong file, scanned PDF, broken encoding) and the caller must stop.
const REQUIRED_PHRASES = [
  "แนวทางปฏิบัติในการจัดตารางสอน",
  "คาบที่ 9",
  "คาบที่ 11",
  "คาบ 4, 5 หรือ 6",
  "คาบที่ 6-7",
  "24",
  "28",
  "30",
  "38",
  "COM1",
  "LAB1",
]

export function checkGuidelineText(text) {
  const missing = REQUIRED_PHRASES.filter((p) => !text.includes(p))
  const rules = (text.match(/^\s*\d{1,2}\.\s/gm) || []).length
  return {
    ok: missing.length === 0 && rules >= 19,
    phraseCount: REQUIRED_PHRASES.length,
    missingPhrases: missing,
    numberedItems: rules,
    message:
      missing.length === 0 && rules >= 19
        ? `Guideline text looks intact: ${rules} numbered items, all ${REQUIRED_PHRASES.length} anchor phrases found.`
        : `Guideline text looks incomplete: ${rules} numbered items, missing anchors: ${missing.join(", ") || "none"}.`,
  }
}

export async function extractGuidelineText(pdfPath, outDir) {
  const path = resolve(pdfPath)
  try {
    await mkdir(resolve(outDir), { recursive: true })
  } catch (err) {
    return { error: true, code: "E_OUT_DIR", message: `Cannot create output directory: ${err.message}` }
  }

  const txtPath = resolve(outDir, "guideline.txt")
  try {
    await new Promise((ok, fail) => {
      execFile("pdftotext", ["-layout", path, txtPath], { maxBuffer: 8 * 1024 * 1024 }, (err) => {
        if (err) fail(err)
        else ok()
      })
    })
  } catch (err) {
    if (err.code === "ENOENT") {
      return {
        error: true,
        code: "E_PDFTOTEXT_MISSING",
        message: "`pdftotext` is not installed. Install poppler-utils, or pass --guideline-text <file> with pre-extracted text.",
      }
    }
    return { error: true, code: "E_PDF_EXTRACT", message: `pdftotext failed for ${pdfPath}: ${err.message}` }
  }

  let text
  try {
    text = await readFile(txtPath, "utf8")
  } catch (err) {
    return { error: true, code: "E_PDF_READ", message: `Extracted text not readable: ${err.message}` }
  }

  if (!text.trim()) {
    return {
      error: true,
      code: "E_PDF_EMPTY",
      message:
        "Extracted guideline text is empty — the PDF is probably scanned and needs OCR before ingest can read the rules.",
    }
  }

  const checks = checkGuidelineText(text)
  return { error: false, text, txtPath, checks }
}

// Alternative path for environments without pdftotext: a reviewed, pre-extracted text file.
export async function readGuidelineTextFile(textPath, outDir) {
  try {
    const text = await readFile(resolve(textPath), "utf8")
    if (!text.trim()) {
      return { error: true, code: "E_PDF_EMPTY", message: `${textPath} is empty.` }
    }
    await mkdir(resolve(outDir), { recursive: true })
    const txtPath = resolve(outDir, "guideline.txt")
    await writeFile(txtPath, text, "utf8")
    return { error: false, text, txtPath, checks: checkGuidelineText(text) }
  } catch (err) {
    return { error: true, code: "E_GUIDELINE_TEXT", message: `Cannot read guideline text ${textPath}: ${err.message}` }
  }
}
