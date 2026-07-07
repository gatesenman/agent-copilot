/**
 * 轻量语法高亮（零依赖）— 支持 js/ts/py/java/sql/json/html/css/bash/vue
 * 输出带 span.tok-* 类名的 HTML（已转义，可安全 v-html）。
 */

const KEYWORDS: Record<string, string[]> = {
  javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'extends', 'import', 'export', 'from', 'default', 'async', 'await', 'new', 'this', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'switch', 'case', 'break', 'continue', 'null', 'undefined', 'true', 'false', 'yield', 'static', 'get', 'set'],
  typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'extends', 'implements', 'interface', 'type', 'enum', 'import', 'export', 'from', 'default', 'async', 'await', 'new', 'this', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of', 'switch', 'case', 'break', 'continue', 'null', 'undefined', 'true', 'false', 'readonly', 'private', 'public', 'protected', 'abstract', 'namespace', 'declare', 'as', 'satisfies', 'keyof', 'never', 'unknown', 'any', 'string', 'number', 'boolean', 'void'],
  python: ['def', 'return', 'if', 'elif', 'else', 'for', 'while', 'class', 'import', 'from', 'as', 'with', 'try', 'except', 'finally', 'raise', 'lambda', 'None', 'True', 'False', 'and', 'or', 'not', 'in', 'is', 'pass', 'break', 'continue', 'global', 'nonlocal', 'yield', 'async', 'await', 'self'],
  java: ['public', 'private', 'protected', 'static', 'final', 'void', 'int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short', 'class', 'interface', 'enum', 'record', 'extends', 'implements', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this', 'super', 'try', 'catch', 'finally', 'throw', 'throws', 'import', 'package', 'null', 'true', 'false', 'var', 'abstract', 'synchronized', 'volatile', 'instanceof', 'default'],
  sql: ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AS', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'NULL', 'IS', 'IN', 'BETWEEN', 'LIKE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'UNION', 'ALL', 'EXISTS', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'DESC', 'ASC', 'WITH'],
  css: ['color', 'background', 'display', 'position', 'margin', 'padding', 'border', 'width', 'height', 'flex', 'grid', 'font-size', 'font-weight', 'important'],
  bash: ['if', 'then', 'else', 'elif', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'function', 'return', 'echo', 'export', 'cd', 'ls', 'grep', 'awk', 'sed', 'curl', 'npm', 'pnpm', 'npx', 'node', 'git', 'mvn', 'java'],
}

const ALIASES: Record<string, string> = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript',
  ts: 'typescript', tsx: 'typescript', vue: 'typescript',
  py: 'python', sh: 'bash', shell: 'bash', zsh: 'bash',
  json: 'javascript', html: 'markup', xml: 'markup',
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function highlightCode(code: string, language?: string): string {
  const lang = ALIASES[language ?? ''] ?? language ?? 'javascript'

  if (lang === 'markup') return highlightMarkup(code)

  const keywords = KEYWORDS[lang] ?? KEYWORDS.javascript
  const kwSet = new Set(lang === 'sql' ? keywords.map((k) => k.toUpperCase()) : keywords)
  const commentPattern =
    lang === 'python' || lang === 'bash' ? /(#[^\n]*)/
      : lang === 'sql' ? /(--[^\n]*|\/\*[\s\S]*?\*\/)/
      : /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/

  // 分词：注释 | 字符串 | 数字 | 标识符 | 其他
  const tokenRe = new RegExp(
    `${commentPattern.source}|('(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*"|\`(?:[^\`\\\\]|\\\\.)*\`)|(\\b\\d[\\d_]*(?:\\.\\d+)?\\b)|([A-Za-z_$][\\w$]*)`,
    'g',
  )

  let out = ''
  let last = 0
  let m: RegExpExecArray | null
  while ((m = tokenRe.exec(code))) {
    out += esc(code.slice(last, m.index))
    const [full, comment, str, num, ident] = m
    if (comment) out += `<span class="tok-comment">${esc(comment)}</span>`
    else if (str) out += `<span class="tok-string">${esc(str)}</span>`
    else if (num) out += `<span class="tok-number">${esc(num)}</span>`
    else if (ident) {
      const key = lang === 'sql' ? ident.toUpperCase() : ident
      if (kwSet.has(key)) out += `<span class="tok-keyword">${esc(ident)}</span>`
      else if (/^[A-Z]/.test(ident) && lang !== 'sql') out += `<span class="tok-type">${esc(ident)}</span>`
      else out += esc(ident)
    } else out += esc(full)
    last = m.index + full.length
  }
  out += esc(code.slice(last))
  return out
}

function highlightMarkup(code: string): string {
  return esc(code)
    .replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="tok-keyword">$2</span>')
    .replace(/([\w-]+)(=)(&quot;[^&]*&quot;|'[^']*')/g, '<span class="tok-type">$1</span>$2<span class="tok-string">$3</span>')
}
