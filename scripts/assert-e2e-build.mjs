import { readdir, readFile } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fixtureRoot = resolve(packageRoot, 'examples/e2e-vault')
const distRoot = resolve(fixtureRoot, '.vitepress/dist')
const customPublicData = resolve(fixtureRoot, 'public-files/e2e-vault-data.json')

async function walkFiles(root, predicate) {
  const results = []
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const absolutePath = join(root, entry.name)
    if (entry.isDirectory()) {
      results.push(...await walkFiles(absolutePath, predicate))
    } else if (predicate(absolutePath)) {
      results.push(absolutePath)
    }
  }
  return results
}

const sourcePages = (await walkFiles(
  fixtureRoot,
  (file) => extname(file) === '.md' && !file.includes('/_perspectives_/'),
)).filter((file) => !file.endsWith('/README.md') && !file.endsWith('/_sidebar.md'))

if (sourcePages.length < 10 || sourcePages.length > 20) {
  throw new Error(`e2e vault must remain small (10–20 pages); found ${sourcePages.length}`)
}

for (const relativePath of [
  'index.html',
  'zh/index.html',
  'notes/index.html',
  '_perspectives_/graph.html',
  '_perspectives_/stats.html',
  '_perspectives_/tags.html',
  'e2e-vault-data.json',
]) {
  await readFile(resolve(distRoot, relativePath))
}

const sourceVaultData = JSON.parse(await readFile(customPublicData, 'utf8'))
const builtVaultData = JSON.parse(
  await readFile(resolve(distRoot, 'e2e-vault-data.json'), 'utf8'),
)
if (
  !Array.isArray(sourceVaultData.nodes) ||
  sourceVaultData.nodes.length !== builtVaultData.nodes?.length
) {
  throw new Error('Views data did not flow through the configured Vite publicDir')
}

const homeHtml = await readFile(resolve(distRoot, 'index.html'), 'utf8')
if (!homeHtml.includes('<code>[[Start Here]]</code>')) {
  throw new Error('Home feature trusted <code> markup is missing from SSR output')
}
if (!homeHtml.includes('/e2e/assets/')) {
  throw new Error('Built HTML does not use the configured /e2e/ base')
}

const notesHtml = await readFile(resolve(distRoot, 'notes/index.html'), 'utf8')
if (!notesHtml.includes('ayn-doc-header')) {
  throw new Error('DocHeader did not render during SSR')
}
if (!notesHtml.includes('/e2e/cover.svg')) {
  throw new Error('DocHeader cover did not inherit the configured base')
}

const emittedAssets = await walkFiles(
  resolve(distRoot, 'vault-assets'),
  (file) => extname(file) === '.svg',
)
if (emittedAssets.length === 0) {
  throw new Error('Special-character vault asset was not emitted')
}

const localGraphChunks = await walkFiles(
  resolve(distRoot, 'assets/chunks'),
  (file) => basename(file).startsWith('LocalGraphModal.') && extname(file) === '.js',
)
if (localGraphChunks.length === 0) {
  throw new Error('LocalGraph async modal chunk was not emitted')
}

const allHtml = await Promise.all(
  (await walkFiles(distRoot, (file) => extname(file) === '.html'))
    .map((file) => readFile(file, 'utf8')),
)
if (allHtml.some((html) => html.includes('file://') || html.includes('/__ayn_asset__/'))) {
  throw new Error('Built HTML contains a local or unresolved vault asset URL')
}
if (!allHtml.some((html) => html.includes('/e2e/vault-assets/diagram%20%26%20'))) {
  throw new Error('Built HTML does not reference the emitted special-character asset URL')
}
if (!allHtml.some((html) => html.includes('class="wikilink'))) {
  throw new Error('No rendered wikilinks were found in the built HTML')
}

console.log(`e2e vault build checks passed (${sourcePages.length} source pages).`)
