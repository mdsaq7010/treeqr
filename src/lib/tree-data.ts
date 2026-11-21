import type { TreeDetails, TreeImage, TreeRecord } from './types'

type WikiSummary = {
  title: string
  extract: string
  content_urls?: { desktop?: { page?: string } }
  thumbnail?: { source: string }
  pageid?: number
  description?: string
}

type WikiPage = {
  pageid: number
  title: string
  extract?: string
  pageprops?: { wikibase_item?: string }
}

type WikiQuery = { query?: { pages?: Record<string, WikiPage> } }
type Entity = {
  labels?: { en?: { value: string } }
  claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: string | { id?: string } } } }>>
}
type EntityResponse = { entities: Record<string, Entity> }
type CommonsResponse = { query?: { pages?: Record<string, { imageinfo?: Array<{ thumburl?: string; descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }> }> } }

const wikiApi = 'https://en.wikipedia.org/w/api.php'

function claimValue(entity: Entity, property: string): string | undefined {
  const value = entity.claims?.[property]?.[0]?.mainsnak?.datavalue?.value
  return typeof value === 'string' ? value : undefined
}

function claimItem(entity: Entity, property: string): string | undefined {
  const value = entity.claims?.[property]?.[0]?.mainsnak?.datavalue?.value
  return typeof value === 'object' && value !== null ? value.id : undefined
}

function sectionsOf(text: string): Array<{ heading: string; body: string }> {
  const parts = text.split(/\n(?=={2,6}\s)/)
  return parts.map((part) => {
    const match = part.match(/^={2,6}\s*(.*?)\s*={2,6}\s*\n?/)
    return { heading: match?.[1] ?? '', body: match ? part.slice(match[0].length).trim() : part.trim() }
  })
}

function findSection(sections: Array<{ heading: string; body: string }>, pattern: RegExp): string {
  const match = sections.find(({ heading, body }) => pattern.test(heading) && body)
  return match ? match.body.replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').slice(0, 900).trim() : ''
}

function findSentences(sections: Array<{ heading: string; body: string }>, pattern: RegExp): string {
  const text = sections.flatMap(({ body }) => body.match(/[^.!?]+[.!?]+/g) ?? [])
    .map((sentence) => sentence.replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim())
    .filter((sentence) => pattern.test(sentence))
  return [...new Set(text)].slice(0, 6).join(' ').slice(0, 900)
}

async function wikiJson<T>(params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ ...params, format: 'json', origin: '*' })
  const response = await fetch(`${wikiApi}?${query}`)
  if (!response.ok) throw new Error('Wikipedia could not be reached. Please try again in a moment.')
  return response.json() as Promise<T>
}

async function getWikiImages(title: string): Promise<TreeImage[]> {
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${title} tree`,
    gsrnamespace: '6',
    gsrlimit: '5',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '1200',
    format: 'json',
    origin: '*',
  })}`)
  if (!response.ok) return []
  const result = await response.json() as CommonsResponse
  return Object.values(result.query?.pages ?? {}).flatMap((page) => {
    const info = page.imageinfo?.[0]
    if (!info?.thumburl || !info.descriptionurl) return []
    const metadata = info.extmetadata ?? {}
    const creditHtml = metadata.Artist?.value ?? metadata.Credit?.value ?? ''
    const credit = creditHtml.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90)
    return [{ url: info.thumburl, credit, sourceUrl: info.descriptionurl }]
  })
}

async function getWikidataInfo(itemId: string | undefined): Promise<{ scientificName: string; family: string; origin: string }> {
  if (!itemId) return { scientificName: '', family: '', origin: '' }
  const first = await fetch(`https://www.wikidata.org/w/api.php?${new URLSearchParams({
    action: 'wbgetentities',
    ids: itemId,
    props: 'claims|labels',
    languages: 'en',
    format: 'json',
    origin: '*',
  })}`)
  if (!first.ok) return { scientificName: '', family: '', origin: '' }
  const initial = await first.json() as EntityResponse
  const entity = initial.entities[itemId]
  const scientificName = claimValue(entity, 'P225') ?? ''
  const originId = claimItem(entity, 'P183') ?? claimItem(entity, 'P17') ?? claimItem(entity, 'P495')
  const familyId = claimItem(entity, 'P171')

  const labelIds = [familyId, originId].filter((id): id is string => Boolean(id))
  const labels: Record<string, string> = {}
  if (labelIds.length) {
    const response = await fetch(`https://www.wikidata.org/w/api.php?${new URLSearchParams({
      action: 'wbgetentities',
      ids: [...new Set(labelIds)].join('|'),
      props: 'labels',
      languages: 'en',
      format: 'json',
      origin: '*',
    })}`)
    if (response.ok) {
      const data = await response.json() as EntityResponse
      for (const [id, item] of Object.entries(data.entities)) {
        labels[id] = item.labels?.en?.value ?? ''
      }
    }
  }

  return {
    scientificName,
    family: familyId ? labels[familyId] ?? '' : '',
    origin: originId ? labels[originId] ?? '' : '',
  }
}

export async function fetchTreeInfo(input: string): Promise<TreeRecord> {
  const search = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(input.trim().replace(/ /g, '_'))}`)
  if (search.status === 404) throw new Error(`We couldn’t find “${input}” in the available tree references. Try another name.`)
  if (!search.ok) throw new Error('The tree reference service is unavailable. Please try again.')
  const summary = await search.json() as WikiSummary
  if (!summary.extract || !summary.pageid) throw new Error(`We couldn’t find reliable information for “${input}”.`)

  const wikiData = await wikiJson<WikiQuery>({
    action: 'query',
    prop: 'extracts|pageprops',
    explaintext: '1',
    exsectionformat: 'wiki',
    redirects: '1',
    titles: summary.title,
  })
  const page = Object.values(wikiData.query?.pages ?? {})[0]
  const [structured, images] = await Promise.all([
    getWikidataInfo(page?.pageprops?.wikibase_item),
    getWikiImages(summary.title),
  ])
  const sections = sectionsOf(page?.extract ?? summary.extract)
  const familyMatch = summary.extract.match(/(?:family|belong(?:s)? to the family)\s+([A-Z][A-Za-z ]{2,40}?)(?:\.|,|;)/i)
  const details: TreeDetails = {
    description: summary.extract,
    physical: findSection(sections, /^(description|morphology|characteristics|appearance|growth)$/i) || findSentences(sections, /\b(tree|height|trunk|bark|branch|crown|evergreen|deciduous)\b/i),
    leaves: findSection(sections, /^(leaves|leaf|foliage)$/i) || findSentences(sections, /\b(leaves|leaflets|foliage)\b/i),
    flowers: findSection(sections, /^(flowers?( and| &)? fruits?|fruit|reproduction)$/i) || findSentences(sections, /\b(flowers?|fruits?|seeds?)\b/i),
    benefits: findSection(sections, /^(ecology|environment|ecological importance|habitat)$/i) || findSentences(sections, /\b(shade|drought resistance|soil fertility|carbon dioxide sink|habitat)\b/i),
    medicinal: findSection(sections, /^(medicinal uses?|traditional medicine)$/i) || findSentences(sections, /\b(medicinal|traditional medicine)\b/i),
    facts: findSection(sections, /^(etymology|cultural significance|history|uses)$/i),
  }
  const originSentence = findSentences(sections, /\bnative to\b/i)
  const commonNameMatch = summary.extract.match(/\bcommonly known as\s+([^,.;]+)/i)
  const commonName = commonNameMatch
    ? commonNameMatch[1].trim().replace(/^\w/, (letter) => letter.toLocaleUpperCase())
    : summary.title
  const normalized = commonName.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const hash = Array.from(normalized).reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619), 2166136261).toString(36)
  const slug = normalized.replace(/\s+/g, '-').slice(0, 48) || 'tree'
  return {
    id: `${slug}-${hash}`,
    canonicalKey: normalized,
    commonName,
    scientificName: structured.scientificName || (summary.extract.toLocaleLowerCase().startsWith(summary.title.toLocaleLowerCase()) ? summary.title : ''),
    family: structured.family || familyMatch?.[1]?.trim() || '',
    origin: structured.origin || originSentence,
    description: summary.extract,
    details,
    images: images.length ? images : summary.thumbnail ? [{ url: summary.thumbnail.source, credit: '', sourceUrl: summary.content_urls?.desktop?.page ?? '' }] : [],
    sourceUrl: summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(summary.title.replace(/ /g, '_'))}`,
    wikidataUrl: page?.pageprops?.wikibase_item ? `https://www.wikidata.org/wiki/${page.pageprops.wikibase_item}` : '',
    updatedAt: new Date().toISOString(),
  }
}
