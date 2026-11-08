import type ExcelJS from 'exceljs'

export const QUIZ_IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024

export interface ImportedQuizQuestion {
  questionText: string
  explanation: string
  points: string
  options: Array<{ optionText: string; isCorrect: boolean }>
}

export interface QuizWorkbookImportError {
  row: number
  column: string
  message: string
}

export interface QuizWorkbookImportPreview {
  sheetName: string
  questions: ImportedQuizQuestion[]
  errors: QuizWorkbookImportError[]
  sourceRows: number
}

const REQUIRED_HEADERS = [
  'Câu',
  'Câu hỏi',
  'Đáp án A',
  'Đáp án B',
  'Đáp án C',
  'Đáp án đúng',
] as const

function normalizeText(value: string) {
  return value.replace(/\s+/gu, ' ').trim()
}

function columnName(column: number) {
  let current = column
  let result = ''
  while (current > 0) {
    const remainder = (current - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    current = Math.floor((current - 1) / 26)
  }
  return result
}

function getCellText(cell: ExcelJS.Cell) {
  const value = cell.value
  if (value && typeof value === 'object') {
    if ('formula' in value || 'sharedFormula' in value) return { text: '', formula: true }
    if ('richText' in value)
      return {
        text: normalizeText(value.richText.map((part) => part.text).join('')),
        formula: false,
      }
    if ('text' in value && typeof value.text === 'string')
      return { text: normalizeText(value.text), formula: false }
    return { text: '', formula: false }
  }
  return { text: value == null ? '' : normalizeText(String(value)), formula: false }
}

export async function parseQuizWorkbook(file: File): Promise<QuizWorkbookImportPreview> {
  if (!file.name.toLocaleLowerCase('en').endsWith('.xlsx')) throw new Error('Chỉ hỗ trợ tệp .xlsx.')
  if (file.size === 0) throw new Error('Tệp Excel đang trống.')
  if (file.size > QUIZ_IMPORT_MAX_FILE_BYTES) throw new Error('Tệp Excel vượt quá giới hạn 5 MB.')

  const { default: ExcelJSRuntime } = await import('exceljs')
  const workbook = new ExcelJSRuntime.Workbook()
  try {
    await workbook.xlsx.load(await file.arrayBuffer())
  } catch {
    throw new Error('Không đọc được tệp .xlsx. Hãy kiểm tra tệp có bị hỏng không.')
  }
  const worksheet = workbook.worksheets.find((sheet) => sheet.state === 'visible')
  if (!worksheet) throw new Error('Tệp không có sheet hiển thị để nhập câu hỏi.')

  let headerRow = 0
  let headerColumns = new Map<string, number>()
  for (let rowNumber = 1; rowNumber <= Math.min(worksheet.rowCount, 20); rowNumber += 1) {
    const row = worksheet.getRow(rowNumber)
    const values = new Map<string, number>()
    row.eachCell({ includeEmpty: false }, (cell, column) => {
      const { text } = getCellText(cell)
      if (text) values.set(text.toLocaleLowerCase('vi'), column)
    })
    if (REQUIRED_HEADERS.every((header) => values.has(header.toLocaleLowerCase('vi')))) {
      headerRow = rowNumber
      headerColumns = new Map(
        REQUIRED_HEADERS.map((header) => [header, values.get(header.toLocaleLowerCase('vi'))!]),
      )
      break
    }
  }
  if (!headerRow) {
    throw new Error(`Không tìm thấy đủ tiêu đề cột: ${REQUIRED_HEADERS.join(', ')}.`)
  }

  const questions: ImportedQuizQuestion[] = []
  const errors: QuizWorkbookImportError[] = []
  const seenQuestions = new Set<string>()
  let sourceRows = 0
  for (let rowNumber = headerRow + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber)
    const cells = REQUIRED_HEADERS.map((header) =>
      getCellText(row.getCell(headerColumns.get(header)!)),
    )
    if (cells.every((cell) => !cell.text && !cell.formula)) continue
    sourceRows += 1
    const values = Object.fromEntries(
      REQUIRED_HEADERS.map((header, index) => [header, cells[index]!]),
    ) as Record<(typeof REQUIRED_HEADERS)[number], { text: string; formula: boolean }>
    const report = (header: (typeof REQUIRED_HEADERS)[number], message: string) => {
      errors.push({ row: rowNumber, column: columnName(headerColumns.get(header)!), message })
    }

    for (const [index, header] of REQUIRED_HEADERS.entries())
      if (cells[index]!.formula) report(header, 'Không hỗ trợ ô chứa công thức.')

    const questionText = values['Câu hỏi'].text
    if (!questionText && !values['Câu hỏi'].formula)
      report('Câu hỏi', 'Câu hỏi không được để trống.')
    const options = [values['Đáp án A'].text, values['Đáp án B'].text, values['Đáp án C'].text]
    for (const [index, option] of options.entries())
      if (!option && !cells[index + 2]!.formula)
        report(
          (['Đáp án A', 'Đáp án B', 'Đáp án C'] as const)[index]!,
          'Lựa chọn không được để trống.',
        )
    const answer = values['Đáp án đúng'].text.toUpperCase()
    if (!['A', 'B', 'C'].includes(answer) && !values['Đáp án đúng'].formula)
      report('Đáp án đúng', 'Đáp án đúng phải là A, B hoặc C.')

    const normalizedQuestion = questionText.toLocaleLowerCase('de')
    if (normalizedQuestion && seenQuestions.has(normalizedQuestion))
      report('Câu hỏi', 'Câu hỏi bị trùng với một dòng trước đó.')

    const rowErrorCount = errors.filter((error) => error.row === rowNumber).length
    if (rowErrorCount) continue
    if (normalizedQuestion) seenQuestions.add(normalizedQuestion)
    questions.push({
      questionText,
      explanation: '',
      points: '1',
      options: options.map((optionText, index) => ({
        optionText,
        isCorrect: answer === ['A', 'B', 'C'][index],
      })),
    })
  }

  if (sourceRows === 0)
    errors.push({
      row: headerRow + 1,
      column: 'A',
      message: 'Không có dòng câu hỏi nào trong sheet.',
    })

  return { sheetName: worksheet.name, questions, errors, sourceRows }
}
