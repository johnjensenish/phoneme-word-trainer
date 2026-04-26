/**
 * Generate the app's home-screen / PWA icons: an ear emoji on a brand-orange tile.
 *
 * Fetches the Twemoji ear glyph (which is plain SVG paths, no font dependency),
 * composites it onto a square orange tile, and rasterizes to PNG at the sizes
 * iOS apple-touch-icon and the web app manifest expect.
 *
 * Run: bun run generate-icon
 *
 * Twemoji graphics are licensed CC-BY 4.0 (https://github.com/jdecked/twemoji).
 */

import { Resvg } from '@resvg/resvg-js'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const BRAND_ORANGE = '#F97316'
const EAR_TWEMOJI_URL =
  'https://raw.githubusercontent.com/jdecked/twemoji/main/assets/svg/1f442.svg'

const PUBLIC_DIR = join(import.meta.dir, '..', 'public')

const OUTPUTS = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
] as const

async function main() {
  console.log(`Fetching Twemoji ear from ${EAR_TWEMOJI_URL}...`)
  const res = await fetch(EAR_TWEMOJI_URL)
  if (!res.ok) {
    throw new Error(`Failed to fetch ear emoji SVG: ${res.status} ${res.statusText}`)
  }
  const earSvg = await res.text()

  const inner = earSvg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i)?.[1]
  if (!inner) throw new Error('Could not extract inner SVG content')

  const viewBox = earSvg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 36 36'
  const parts = viewBox.split(/\s+/).map(Number)
  const vbW = parts[2] ?? 36
  const vbH = parts[3] ?? 36

  // Compose at 1024 so the rasterizer has plenty of headroom; downscale per output size.
  const CANVAS = 1024
  const earBox = CANVAS * 0.62
  const offset = (CANVAS - earBox) / 2
  const scale = earBox / Math.max(vbW, vbH)

  const composite = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" width="${CANVAS}" height="${CANVAS}">
  <rect width="${CANVAS}" height="${CANVAS}" fill="${BRAND_ORANGE}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">${inner}</g>
</svg>`

  await mkdir(PUBLIC_DIR, { recursive: true })

  for (const { name, size } of OUTPUTS) {
    const resvg = new Resvg(composite, { fitTo: { mode: 'width', value: size } })
    const png = resvg.render().asPng()
    const outPath = join(PUBLIC_DIR, name)
    await writeFile(outPath, png)
    console.log(`  wrote ${name} (${size}x${size}, ${png.byteLength} bytes)`)
  }

  // Also save the composite SVG so it can be used as a vector favicon.
  const svgPath = join(PUBLIC_DIR, 'icon.svg')
  await writeFile(svgPath, composite)
  console.log(`  wrote icon.svg`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
