import { supabase } from './supabase'
import type { TreeRecord } from './types'

const storageKey = 'treeqr:trees'
type StoredTree = { id: string; data: TreeRecord }

function normalizeName(name: string): string {
  return name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function readLocalTrees(): StoredTree[] {
  const value = localStorage.getItem(storageKey)
  return value ? JSON.parse(value) as StoredTree[] : []
}

export async function findTree(name: string): Promise<TreeRecord | null> {
  if (supabase) {
    const { data, error } = await supabase.from('trees').select('data').eq('canonical_key', normalizeName(name)).maybeSingle()
    if (error) throw new Error(`Could not check saved trees: ${error.message}`)
    return data?.data as TreeRecord | null
  }
  return readLocalTrees().find(({ data }) => data.canonicalKey === normalizeName(name))?.data ?? null
}

export async function getTree(id: string): Promise<TreeRecord | null> {
  if (supabase) {
    const { data, error } = await supabase.from('trees').select('data').eq('id', id).maybeSingle()
    if (error) throw new Error(`Could not load this tree: ${error.message}`)
    return data?.data as TreeRecord | null
  }
  return readLocalTrees().find((tree) => tree.id === id)?.data ?? null
}

export async function saveTree(tree: TreeRecord): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('trees').upsert({
      id: tree.id,
      canonical_key: tree.canonicalKey,
      data: tree,
      updated_at: tree.updatedAt,
    }, { onConflict: 'id' })
    if (error) throw new Error(`Could not save this tree: ${error.message}`)
    return
  }
  const trees = readLocalTrees()
  const next = trees.filter(({ id }) => id !== tree.id)
  next.push({ id: tree.id, data: tree })
  localStorage.setItem(storageKey, JSON.stringify(next))
}
