export type TreeDetails = {
  description: string
  physical: string
  leaves: string
  flowers: string
  benefits: string
  medicinal: string
  facts: string
}

export type TreeImage = {
  url: string
  credit: string
  sourceUrl: string
}

export type TreeRecord = {
  id: string
  canonicalKey: string
  commonName: string
  scientificName: string
  family: string
  origin: string
  description: string
  details: TreeDetails
  images: TreeImage[]
  sourceUrl: string
  wikidataUrl: string
  updatedAt: string
}
