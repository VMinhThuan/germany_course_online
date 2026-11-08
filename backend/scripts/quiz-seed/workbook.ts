import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";

export const MAX_QUIZ_WORKBOOK_BYTES = 5 * 1024 * 1024;

export type ImportedQuizQuestion = {
  questionText: string;
  options: Array<{ optionText: string; isCorrect: boolean }>;
};

const HEADERS = [
  "Câu",
  "Câu hỏi",
  "Đáp án A",
  "Đáp án B",
  "Đáp án C",
  "Đáp án đúng",
] as const;

function normalize(value: string) {
  return value.replace(/\s+/gu, " ").trim();
}

function readCell(cell: ExcelJS.Cell, row: number, column: number): string {
  const value = cell.value;
  if (value && typeof value === "object") {
    if ("formula" in value || "sharedFormula" in value)
      throw new Error(
        `Workbook contains a formula at row ${row}, column ${column}.`,
      );
    if ("richText" in value)
      return normalize(value.richText.map((part) => part.text).join(""));
    if ("text" in value && typeof value.text === "string")
      return normalize(value.text);
    return "";
  }
  return value == null ? "" : normalize(String(value));
}

export async function readQuizWorkbook(
  path: string,
): Promise<ImportedQuizQuestion[]> {
  if (!path.toLocaleLowerCase("en").endsWith(".xlsx"))
    throw new Error("Quiz source files must use the .xlsx format.");
  const file = await readFile(path);
  if (!file.length || file.length > MAX_QUIZ_WORKBOOK_BYTES)
    throw new Error("Quiz workbook must be between 1 byte and 5 MiB.");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Uint8Array.from(file).buffer as ArrayBuffer);
  const worksheet = workbook.worksheets.find(
    (sheet) => sheet.state === "visible",
  );
  if (!worksheet) throw new Error("Quiz workbook has no visible worksheet.");

  let headerRow = 0;
  let columns = new Map<string, number>();
  for (
    let rowNumber = 1;
    rowNumber <= Math.min(20, worksheet.rowCount);
    rowNumber += 1
  ) {
    const current = new Map<string, number>();
    worksheet
      .getRow(rowNumber)
      .eachCell({ includeEmpty: false }, (cell, column) => {
        const value = readCell(cell, rowNumber, column);
        if (value) current.set(value.toLocaleLowerCase("vi"), column);
      });
    if (
      HEADERS.every((header) => current.has(header.toLocaleLowerCase("vi")))
    ) {
      headerRow = rowNumber;
      columns = new Map(
        HEADERS.map((header) => [
          header,
          current.get(header.toLocaleLowerCase("vi"))!,
        ]),
      );
      break;
    }
  }
  if (!headerRow)
    throw new Error(`Missing required headers: ${HEADERS.join(", ")}.`);

  const questions: ImportedQuizQuestion[] = [];
  const seen = new Set<string>();
  for (
    let rowNumber = headerRow + 1;
    rowNumber <= worksheet.rowCount;
    rowNumber += 1
  ) {
    const values = Object.fromEntries(
      HEADERS.map((header) => [
        header,
        readCell(
          worksheet.getRow(rowNumber).getCell(columns.get(header)!),
          rowNumber,
          columns.get(header)!,
        ),
      ]),
    ) as Record<(typeof HEADERS)[number], string>;
    if (HEADERS.every((header) => !values[header])) continue;
    const prompt = values["Câu hỏi"];
    const options = [
      values["Đáp án A"],
      values["Đáp án B"],
      values["Đáp án C"],
    ];
    const answer = values["Đáp án đúng"].toUpperCase();
    if (!prompt)
      throw new Error(
        `Question text is empty at row ${rowNumber}, column ${columns.get("Câu hỏi")}.`,
      );
    const emptyOption = options.findIndex((option) => !option);
    if (emptyOption >= 0)
      throw new Error(
        `Option is empty at row ${rowNumber}, column ${columns.get(HEADERS[emptyOption + 2]!)}.`,
      );
    if (!["A", "B", "C"].includes(answer))
      throw new Error(
        `Answer key must be A, B or C at row ${rowNumber}, column ${columns.get("Đáp án đúng")}.`,
      );
    const duplicateKey = prompt.toLocaleLowerCase("de");
    if (seen.has(duplicateKey))
      throw new Error(`Duplicate question text at row ${rowNumber}.`);
    seen.add(duplicateKey);
    questions.push({
      questionText: prompt,
      options: options.map((optionText, index) => ({
        optionText,
        isCorrect: answer === ["A", "B", "C"][index],
      })),
    });
  }

  if (!questions.length)
    throw new Error("Quiz workbook contains no questions.");
  return questions;
}
