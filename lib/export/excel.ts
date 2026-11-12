import ExcelJS from "exceljs";

/**
 * Excel export/import using exceljs.
 *
 * The project previously used `xlsx` (SheetJS), which has unpatched prototype
 * pollution / ReDoS advisories on npm. exceljs is maintained and streams large
 * sheets instead of building the whole file in memory.
 */
export async function downloadExcel(filename: string, rows: Record<string, unknown>[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Transactions", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  sheet.columns = headers.map((h) => ({
    header: h,
    key: h,
    width: Math.min(40, Math.max(12, h.length + 4)),
  }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(
      headers.reduce<Record<string, unknown>>((acc, h) => {
        acc[h] = row[h] ?? "";
        return acc;
      }, {})
    );
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function parseExcel(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headers: string[] = [];
  const headerRow = sheet.getRow(1);
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col] = String(cell.value ?? "").trim();
  });

  const rows: Record<string, unknown>[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: Record<string, unknown> = {};
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const header = headers[col];
      if (!header) return;
      // Dates and rich text need normalising so the import mapper sees scalars.
      const value = cell.value;
      if (value instanceof Date) record[header] = value.toISOString();
      else if (value && typeof value === "object" && "text" in value) record[header] = (value as { text: string }).text;
      else record[header] = value ?? "";
    });
    rows.push(record);
  });

  return rows;
}
