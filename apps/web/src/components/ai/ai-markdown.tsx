import { createElement, Fragment, type ReactNode } from 'react'

/**
 * Minimal, dependency-free renderer for the lightly-formatted markdown the AI
 * assistant returns (headings, **bold**, and bullet/numbered lists). Builds
 * React elements directly — no HTML injection, so it's safe for model output.
 */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // Split on **bold** spans, keeping the delimiters.
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    }
    return <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>
  })
}

export function AiMarkdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  let para: string[] = []
  let key = 0

  const flushPara = () => {
    if (para.length) {
      blocks.push(
        <p key={`b${key++}`} className="leading-relaxed">
          {renderInline(para.join(' '), `p${key}`)}
        </p>,
      )
      para = []
    }
  }
  const flushList = () => {
    if (list) {
      const items = list.items.map((it, i) => <li key={`li${key}-${i}`}>{renderInline(it, `li${key}-${i}`)}</li>)
      blocks.push(
        list.ordered ? (
          <ol key={`b${key++}`} className="list-decimal space-y-1 pl-5">
            {items}
          </ol>
        ) : (
          <ul key={`b${key++}`} className="list-disc space-y-1 pl-5">
            {items}
          </ul>
        ),
      )
      list = null
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      flushPara()
      flushList()
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      flushPara()
      flushList()
      const level = heading[1].length
      const cls = level === 1 ? 'text-base font-semibold' : 'text-sm font-semibold'
      blocks.push(
        createElement(`h${level}`, { key: `b${key++}`, className: cls }, renderInline(heading[2], `h${key}`)),
      )
      continue
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (bullet || numbered) {
      flushPara()
      const ordered = !!numbered
      if (!list || list.ordered !== ordered) {
        flushList()
        list = { ordered, items: [] }
      }
      list.items.push(bullet ? bullet[1] : numbered![1])
      continue
    }

    flushList()
    para.push(line.trim())
  }
  flushPara()
  flushList()

  return <div className="space-y-2 text-sm">{blocks}</div>
}
