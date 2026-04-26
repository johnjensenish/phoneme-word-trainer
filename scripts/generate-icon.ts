/**
 * Generate the app's home-screen / PWA icons: an ear glyph on a brand-orange tile.
 *
 * Source priority:
 *   1. scripts/assets/ear-source.png   (preferred — drop in whichever artwork you want)
 *   2. scripts/assets/ear-source.svg
 *   3. Twemoji ear SVG fetched from GitHub (fallback, CC-BY 4.0)
 *
 * To use a specific style (e.g. the Apple ear from Emojipedia), save the PNG to
 * scripts/assets/ear-source.png and re-run. The largest available size produces
 * the cleanest output.
 *
 * Run: bun run generate-icon
 */

import { Resvg } from '@resvg/resvg-js'
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const BRAND_ORANGE = '#F97316'
const TWEMOJI_FALLBACK_URL =
  'https://raw.githubusercontent.com/jdecked/twemoji/main/assets/svg/1f442.svg'

const SCRIPT_DIR = import.meta.dir
const ASSETS_DIR = join(SCRIPT_DIR, 'assets')
const PUBLIC_DIR = join(SCRIPT_DIR, '..', 'public')

const OUTPUTS = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
] as const

const CANVAS = 1024
const EAR_FRACTION = 0.62 // ear glyph occupies ~62% of the tile
const OFFSET = (CANVAS - CANVAS * EAR_FRACTION) / 2
const EAR_BOX = CANVAS * EAR_FRACTION

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

type GlyphSource =
  | { kind: 'png'; data: Buffer }
  | { kind: 'svg'; markup: string; vbW: number; vbH: number }

async function loadSource(): Promise<GlyphSource> {
  const pngPath = join(ASSETS_DIR, 'ear-source.png')
  const svgPath = join(ASSETS_DIR, 'ear-source.svg')

  if (await fileExists(pngPath)) {
    console.log(`Using local PNG: ${pngPath}`)
    return { kind: 'png', data: await readFile(pngPath) }
  }

  if (await fileExists(svgPath)) {
    console.log(`Using local SVG: ${svgPath}`)
    return parseSvg(await readFile(svgPath, 'utf8'))
  }

  console.log(`No local source found in ${ASSETS_DIR}. Fetching Twemoji fallback...`)
  const res = await fetch(TWEMOJI_FALLBACK_URL)
  if (!res.ok) {
    throw new Error(`Failed to fetch Twemoji ear: ${res.status} ${res.statusText}`)
  }
  return parseSvg(await res.text())
}

function parseSvg(markup: string): GlyphSource {
  const inner = markup.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i)?.[1]
  if (!inner) throw new Error('Could not extract inner <svg> content')
  const viewBox = markup.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 36 36'
  const parts = viewBox.split(/\s+/).map(Number)
  const vbW = parts[2] ?? 36
  const vbH = parts[3] ?? 36
  return { kind: 'svg', markup: inner, vbW, vbH }
}

function composeSvg(source: GlyphSource): string {
  const tile = `<rect width="${CANVAS}" height="${CANVAS}" fill="${BRAND_ORANGE}"/>`

  if (source.kind === 'png') {
    const dataUri = `data:image/png;base64,${source.data.toString('base64')}`
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" width="${CANVAS}" height="${CANVAS}">
  ${tile}
  <image href="${dataUri}" x="${OFFSET}" y="${OFFSET}" width="${EAR_BOX}" height="${EAR_BOX}" preserveAspectRatio="xMidYMid meet"/>
</svg>`
  }

  const scale = EAR_BOX / Math.max(source.vbW, source.vbH)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" width="${CANVAS}" height="${CANVAS}">
  ${tile}
  <g transform="translate(${OFFSET} ${OFFSET}) scale(${scale})">${source.markup}</g>
</svg>`
}

async function main() {
  const source = await loadSource()
  const composite = composeSvg(source)

  await mkdir(PUBLIC_DIR, { recursive: true })

  for (const { name, size } of OUTPUTS) {
    const resvg = new Resvg(composite, { fitTo: { mode: 'width', value: size } })
    const png = resvg.render().asPng()
    const outPath = join(PUBLIC_DIR, name)
    await writeFile(outPath, png)
    console.log(`  wrote ${name} (${size}x${size}, ${png.byteLength} bytes)`)
  }

  const svgPath = join(PUBLIC_DIR, 'icon.svg')
  await writeFile(svgPath, composite)
  console.log(`  wrote icon.svg`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
