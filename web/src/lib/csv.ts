export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: "," | ";";
}

function detectDelimiter(headerLine: string): "," | ";" {
  let commaCount = 0;
  let semiCount = 0;
  let inQuotes = false;
  for (let i = 0; i < headerLine.length; i += 1) {
    const ch = headerLine[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (ch === ",") commaCount += 1;
      else if (ch === ";") semiCount += 1;
    }
  }
  return semiCount > commaCount ? ";" : ",";
}

function parseCsvLines(text: string, delimiter: "," | ";"): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field.trim());
      field = "";
    } else if (ch === "\r" && next === "\n") {
      row.push(field.trim());
      records.push(row);
      row = [];
      field = "";
      i += 1;
    } else if (ch === "\n" || ch === "\r") {
      row.push(field.trim());
      records.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    records.push(row);
  }

  return records.filter((r) => r.some((cell) => cell.length > 0));
}

export function parseCsv(rawText: string): ParsedCsv {
  const cleaned = rawText.replace(/^\uFEFF/, "").trim();
  if (!cleaned) {
    throw new Error("File CSV kosong. Unggah file CSV yang memiliki header dan data pelanggan.");
  }

  const firstNewline = cleaned.search(/\r?\n/);
  const firstLine = firstNewline >= 0 ? cleaned.slice(0, firstNewline) : cleaned;
  const delimiter = detectDelimiter(firstLine);

  const records = parseCsvLines(cleaned, delimiter);
  if (records.length < 2) {
    throw new Error("CSV harus memiliki minimal 1 baris header dan data pelanggan.");
  }

  const headers = records[0].map((h, idx) => h.trim() || `kolom_${idx + 1}`);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < records.length; i += 1) {
    const values = records[i];
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c += 1) {
      obj[headers[c]] = (values[c] ?? "").trim();
    }
    rows.push(obj);
  }

  return { headers, rows, delimiter };
}

export function parseNumericValue(raw: string | undefined): number | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed || /^(-|n\/a|na|null|none|nan)$/i.test(trimmed)) return null;

  // Handle Indonesian currency like "Rp 450.000" or "Rp 1.450.000,50"
  let normalized = trimmed
    .replace(/^rp\.?\s*/i, "")
    .replace(/%$/, "")
    .replace(/\s+/g, "");

  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/,/g, "");
  } else if (/^-?\d+,\d{1,2}$/.test(normalized)) {
    normalized = normalized.replace(",", ".");
  }

  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

export function parseBinaryChurn(raw: string | undefined): number | null {
  if (raw == null) return null;
  const v = raw.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "ya" || v === "churn" || v === "churned") {
    return 1;
  }
  if (v === "0" || v === "false" || v === "no" || v === "tidak" || v === "active" || v === "aktif" || v === "retained") {
    return 0;
  }
  return null;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function toSafeCsv(
  headers: string[],
  rows: Array<Array<string | number>>,
): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((r) => r.map(escapeCsvCell).join(",")),
  ];
  return lines.join("\n");
}
