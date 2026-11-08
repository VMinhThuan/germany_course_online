import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { afterEach, describe, expect, it } from "vitest";
import { readQuizWorkbook } from "../../scripts/quiz-seed/workbook.js";

const testDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    testDirectories.map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
  testDirectories.length = 0;
});

async function createWorkbook(rows: Array<Array<ExcelJS.CellValue>>) {
  const testDirectory = await mkdtemp(join(tmpdir(), "paniverse-quiz-import-"));
  testDirectories.push(testDirectory);
  const path = join(testDirectory, "questions.xlsx");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Bài tập chia động từ");
  for (const row of rows) sheet.addRow(row);
  await workbook.xlsx.writeFile(path);
  return path;
}

const headers = [
  "Câu",
  "Câu hỏi",
  "Đáp án A",
  "Đáp án B",
  "Đáp án C",
  "Đáp án đúng",
];

describe("quiz seed workbook reader", () => {
  it("imports answer mapping with whitespace normalization", async () => {
    const path = await createWorkbook([
      ["Instructions"],
      headers,
      [
        "1",
        "  Was   machst du? ",
        " Ich   lerne ",
        " Ich lernst ",
        " Ich lernen ",
        " A ",
      ],
    ]);

    await expect(readQuizWorkbook(path)).resolves.toEqual([
      {
        questionText: "Was machst du?",
        options: [
          { optionText: "Ich lerne", isCorrect: true },
          { optionText: "Ich lernst", isCorrect: false },
          { optionText: "Ich lernen", isCorrect: false },
        ],
      },
    ]);
  });

  it("rejects invalid answer keys, duplicate prompts, formulas and incomplete headers", async () => {
    const badAnswerPath = await createWorkbook([
      headers,
      ["1", "Was machst du?", "A", "B", "C", "D"],
    ]);
    await expect(readQuizWorkbook(badAnswerPath)).rejects.toThrow(/row 2/);

    const duplicatePath = await createWorkbook([
      headers,
      ["1", "Was machst du?", "A", "B", "C", "A"],
      ["2", "Was machst du?", "D", "E", "F", "B"],
    ]);
    await expect(readQuizWorkbook(duplicatePath)).rejects.toThrow(
      /Duplicate question text at row 3/,
    );

    const formulaPath = await createWorkbook([
      headers,
      ["1", "Was machst du?", "A", "B", "C", { formula: '"A"' }],
    ]);
    await expect(readQuizWorkbook(formulaPath)).rejects.toThrow(/formula/);

    const missingHeaderPath = await createWorkbook([["A", "B", "C"]]);
    await expect(readQuizWorkbook(missingHeaderPath)).rejects.toThrow(
      /Missing required headers/,
    );
  });
});
