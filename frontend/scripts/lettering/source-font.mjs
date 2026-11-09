import { fileURLToPath, URL } from 'node:url'

export const FONT_PATH = fileURLToPath(new URL('./fonts/Coiny-Regular.ttf', import.meta.url))
export const FONT_LICENSE_PATH = fileURLToPath(new URL('./fonts/OFL.txt', import.meta.url))
export const FONT_SHA256 = 'EF02D723A54ABE4819BEA54EA8B2ECF72D77D258010BB336CD4862A37705EAC7'
export const FONT_SOURCE_COMMIT = '0341b95f0c79f0e0b33ab7b5404cf9265be88516'

export const PILOT_HEADINGS = Object.freeze(['Không gian bài học', 'Không gian khóa học'])
export const LETTERING_CHARACTERS = Object.freeze(
  Array.from(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
      'AĂÂBCDĐEÊGHIKLMNOÔƠPQRSTUƯVXYaăâbcdđeêghiklmnoôơpqrstuưvxy' +
      'ÀÁẢÃẠẰẮẲẴẶẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỮỰỲÝỶỸỴ' +
      'àáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ' +
      'ÄÖÜäöüß.,!?():;·–—/-\u0027"&+•_#*@%$=[]{}<>',
  ),
)
export const COVERAGE_SAMPLES = Object.freeze([
  ...PILOT_HEADINGS,
  LETTERING_CHARACTERS.join(''),
  'Khóa học tiếng Đức',
  'Ngữ pháp tiếng Đức',
  'Grüße aus München',
  'Übungen für Anfänger',
  'Straße',
])

export const LETTERING_STYLE = Object.freeze({
  bodyExpansion: 8,
  outlineExpansion: 28,
  tracking: 26,
  spaceTracking: 10,
  shadowX: 12,
  shadowY: 18,
  pathPrecision: 2,
})
