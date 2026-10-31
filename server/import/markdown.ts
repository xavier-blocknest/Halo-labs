// Minimal Markdown reader for plan documents: title, intro, ## sections with paragraphs, pipe tables and checklists.
export type MdTable = { header: string[]; rows: string[][] }
export type MdSection = { h: string; paragraphs: string[]; tables: MdTable[]; checks: string[]; bullets: string[] }

const clean = (s: string) => s.replace(/\*\*/g, '').replace(/\\~/g, '~').replace(/\\([*_|])/g, '$1').trim()
const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(clean)

export function readMarkdown(text: string) {
  const lines = text.replace(/\r/g, '').split('\n')
  const title = clean(lines.find(l => /^# /.test(l))?.slice(2) ?? '')
  const intro: string[] = [], sections: MdSection[] = []
  let cur: MdSection | null = null, para: string[] = [], table: string[] | null = null
  const flushPara = () => { if (para.length) { (cur ? cur.paragraphs : intro).push(clean(para.join(' '))); para = [] } }
  const flushTable = () => {
    if (table && cur) { const rows = table.filter(l => !/^\s*\|?\s*:?-{3,}/.test(l)).map(cells); cur.tables.push({ header: rows[0], rows: rows.slice(1) }) }
    table = null
  }
  for (const line of lines) {
    if (/^# /.test(line)) continue
    if (/^## /.test(line)) { flushPara(); flushTable(); cur = { h: clean(line.slice(3)), paragraphs: [], tables: [], checks: [], bullets: [] }; sections.push(cur); continue }
    if (/^\s*\|/.test(line)) { flushPara(); (table ??= []).push(line); continue }
    flushTable()
    const check = /^\s*-\s*\[[ xX]\]\s*(.+)$/.exec(line)
    if (check && cur) { flushPara(); cur.checks.push(clean(check[1])); continue }
    const bullet = /^\s*[-*]\s+(.+)$/.exec(line)
    if (bullet && cur) { flushPara(); cur.bullets.push(clean(bullet[1])); continue }
    if (!line.trim()) { flushPara(); continue }
    para.push(line.trim())
  }
  flushPara(); flushTable()
  return { title, intro, sections }
}
