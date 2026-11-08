import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { parseQuizWorkbook } from './workbook-import'

async function workbookFile(rows: Array<Array<ExcelJS.CellValue>>, name = 'quiz.xlsx') {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Bài tập chia động từ')
  for (const row of rows) sheet.addRow(row)
  const bytes = await workbook.xlsx.writeBuffer()
  const arrayBuffer = new Uint8Array(bytes).buffer as ArrayBuffer
  return new File([arrayBuffer], name)
}

const headers = ['Câu', 'Câu hỏi', 'Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án đúng']

describe('quiz workbook importer', () => {
  it('normalizes whitespace and maps German/Vietnamese text and answer key', async () => {
    const file = await workbookFile([
      ['Nguồn câu hỏi'],
      headers,
      ['1', '  Wie   heißt du? ', ' Ich   heiße Lan ', ' Ich bist Lan ', ' Ich heißen Lan ', ' A '],
    ])

    const result = await parseQuizWorkbook(file)

    expect(result.errors).toEqual([])
    expect(result.questions).toEqual([
      {
        questionText: 'Wie heißt du?',
        explanation: '',
        points: '1',
        options: [
          { optionText: 'Ich heiße Lan', isCorrect: true },
          { optionText: 'Ich bist Lan', isCorrect: false },
          { optionText: 'Ich heißen Lan', isCorrect: false },
        ],
      },
    ])
  })

  it('reports cell-level errors and excludes invalid and duplicate rows', async () => {
    const file = await workbookFile([
      headers,
      ['1', 'Wie heißt du?', 'Ich heiße Lan', 'Ich bist Lan', 'Ich heißen Lan', 'A'],
      ['2', 'Wie heißt du?', '', 'Ich bist Lan', 'Ich heißen Lan', 'D'],
    ])

    const result = await parseQuizWorkbook(file)

    expect(result.questions).toHaveLength(1)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          row: 3,
          column: 'B',
          message: 'Câu hỏi bị trùng với một dòng trước đó.',
        }),
        expect.objectContaining({ row: 3, column: 'C', message: 'Lựa chọn không được để trống.' }),
        expect.objectContaining({
          row: 3,
          column: 'F',
          message: 'Đáp án đúng phải là A, B hoặc C.',
        }),
      ]),
    )
  })

  it('does not let an invalid row block a later valid question with the same prompt', async () => {
    const file = await workbookFile([
      headers,
      ['1', 'Wie heißt du?', 'Ich heiße Lan', 'Ich bist Lan', 'Ich heißen Lan', 'D'],
      ['2', 'Wie heißt du?', 'Ich heiße Lan', 'Ich bist Lan', 'Ich heißen Lan', 'A'],
    ])

    const result = await parseQuizWorkbook(file)

    expect(result.questions).toHaveLength(1)
    expect(result.questions[0]?.questionText).toBe('Wie heißt du?')
    expect(result.errors).toEqual([expect.objectContaining({ row: 2, column: 'F' })])
  })

  it('rejects formula cells, missing headers, non-xlsx and malformed files', async () => {
    const formulaFile = await workbookFile([
      headers,
      ['1', 'Wie heißt du?', 'Ich heiße Lan', 'Ich bist Lan', 'Ich heißen Lan', { formula: '"A"' }],
    ])
    const missingHeaderFile = await workbookFile([['A', 'B', 'C']])
    const invalidExtension = await workbookFile([headers], 'quiz.xls')
    const malformed = new File(['not a workbook'], 'broken.xlsx')

    await expect(parseQuizWorkbook(formulaFile)).resolves.toMatchObject({
      questions: [],
      errors: [expect.objectContaining({ row: 2, column: 'F' })],
    })
    await expect(parseQuizWorkbook(missingHeaderFile)).rejects.toThrow(
      'Không tìm thấy đủ tiêu đề cột',
    )
    await expect(parseQuizWorkbook(invalidExtension)).rejects.toThrow('Chỉ hỗ trợ tệp .xlsx')
    await expect(parseQuizWorkbook(malformed)).rejects.toThrow('Không đọc được tệp .xlsx')
  })
})
