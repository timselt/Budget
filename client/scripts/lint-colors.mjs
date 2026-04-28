#!/usr/bin/env node
// Hardcoded hex Tailwind class taraması — `bg-[#xxx]`, `text-[#xxx]` vb.
// Plan: docs/plans/2026-04-27-ui-token-migration-plan.md (PR #5).
// Bulunan her instance için renk @theme token'ı veya finopstur.css utility'si
// üzerinden kullanılmalıdır.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../src', import.meta.url))
const PATTERN = /\b(bg|text|border|from|to|ring|fill|stroke|outline|decoration|divide|placeholder|accent)-\[#[0-9A-Fa-f]{3,8}\]/g

const SKIP_DIRS = new Set(['node_modules', 'dist', '__snapshots__'])
const TARGET_EXT = new Set(['.tsx', '.ts', '.jsx', '.js'])

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      yield* walk(full)
    } else if (TARGET_EXT.has(full.slice(full.lastIndexOf('.')))) {
      yield full
    }
  }
}

const violations = []
for (const file of walk(ROOT)) {
  const content = readFileSync(file, 'utf8')
  const lines = content.split('\n')
  lines.forEach((line, idx) => {
    const matches = line.match(PATTERN)
    if (matches) {
      for (const m of matches) {
        violations.push({ file: relative(ROOT, file), line: idx + 1, match: m })
      }
    }
  })
}

if (violations.length > 0) {
  console.error('\n  Hardcoded hex Tailwind class bulundu:\n')
  for (const v of violations) {
    console.error(`    src/${v.file}:${v.line}  ${v.match}`)
  }
  console.error(`\n  ${violations.length} ihlal. @theme token (örn. text-secondary)`)
  console.error('  veya finopstur.css utility (örn. .alert-tile-info) kullan.')
  console.error('  Plan: docs/plans/2026-04-27-ui-token-migration-plan.md\n')
  process.exit(1)
}
