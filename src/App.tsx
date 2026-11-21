import { useEffect, useState, type FormEvent } from 'react'
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  Leaf,
  LoaderCircle,
  MapPin,
  QrCode,
  Search,
  Share2,
  TreePine,
} from 'lucide-react'
import { findTree, getTree, saveTree } from './lib/storage'
import { fetchTreeInfo } from './lib/tree-data'
import type { TreeRecord } from './lib/types'

const configuredPublicAppUrl = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim()

function parseOrigin(url: string): string | null {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

const configuredPublicOrigin = configuredPublicAppUrl ? parseOrigin(configuredPublicAppUrl) : null

async function getPublicTreeUrl(treeId: string): Promise<string> {
  if (configuredPublicOrigin) {
    return `${configuredPublicOrigin}/tree/${encodeURIComponent(treeId)}`
  }

  const current = new URL(window.location.href)
  if (!['localhost', '127.0.0.1', '::1'].includes(current.hostname)) {
    return `${current.origin}/tree/${encodeURIComponent(treeId)}`
  }
  try {
    const response = await fetch('/__treeqr/address')
    if (response.ok) {
      const address = await response.json() as { host: string; port: number }
      if (address.host && address.host !== 'localhost') {
        return `${current.protocol}//${address.host}:${address.port}/tree/${encodeURIComponent(treeId)}`
      }
    }
  } catch {
    // Keep the local URL as the final fallback.
  }
  return `${current.origin}/tree/${encodeURIComponent(treeId)}`
}

const sections = [
  { key: 'description', title: 'About this tree', icon: '01' },
  { key: 'physical', title: 'Physical characteristics', icon: '02' },
  { key: 'leaves', title: 'Leaves', icon: '03' },
  { key: 'flowers', title: 'Flowers & fruits', icon: '04' },
  { key: 'benefits', title: 'Environmental benefits', icon: '05' },
  { key: 'medicinal', title: 'Medicinal uses', icon: '06' },
  { key: 'facts', title: 'Worth knowing', icon: '07' },
] as const

function Header() {
  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="TreeQR home">
        <span className="brand-mark"><TreePine size={20} strokeWidth={2.2} /></span>
        <span>tree<span className="brand-light">qr</span></span>
      </Link>
      <a className="header-note" href="/#how-it-works">A little more tree, a little more you <Leaf size={14} /></a>
    </header>
  )
}

function HomePage() {
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = query.trim()
    if (!name || busy) return
    setBusy(true)
    setError('')
    try {
      const existing = await findTree(name)
      const record = existing ?? await fetchTreeInfo(name)
      await saveTree(record)
      navigate(`/tree/${encodeURIComponent(record.id)}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> A field guide for everyone</div>
          <h1>Every tree has<br />a story worth <em>sharing.</em></h1>
          <p className="hero-description">Discover trees. Learn about nature. Share knowledge.</p>
          <form className="search-form" onSubmit={handleSubmit}>
            <label htmlFor="tree-name" className="sr-only">Enter tree name</label>
            <Search size={19} aria-hidden="true" />
            <input
              id="tree-name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Enter tree name..."
              autoComplete="off"
              required
            />
            <button type="submit" disabled={busy || !query.trim()}>
              {busy ? <><LoaderCircle className="spin" size={17} /> Finding tree</> : <>Generate QR code <ArrowUpRight size={17} /></>}
            </button>
          </form>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="hero-footnote"><span className="footnote-dot" /> No sign-up. Just nature.</div>
        </div>
        <div className="hero-visual">
          <img
            className="hero-photo"
            src="https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=85"
            alt="Sunlight filtering through a green forest"
          />
          <div className="image-caption">
            <span className="caption-icon"><Leaf size={16} /></span>
            <span><strong>Rooted in curiosity</strong><small>One tree at a time</small></span>
          </div>
          <span className="photo-index">01 / 01</span>
        </div>
        <a href="#how-it-works" className="scroll-cue"><ArrowDown size={16} /> Scroll to explore</a>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="section-heading">
          <span className="eyebrow"><span className="eyebrow-line" /> Simple as a seed</span>
          <h2>One little scan.<br /><em>A lot more wonder.</em></h2>
        </div>
        <div className="steps-grid">
          <article className="step-card"><span className="step-number">01</span><Search size={21} /><h3>Find your tree</h3><p>Search a name and we’ll gather what trusted sources know.</p></article>
          <article className="step-card"><span className="step-number">02</span><QrCode size={21} /><h3>Make it shareable</h3><p>Get a unique tree page and QR code, ready to download.</p></article>
          <article className="step-card"><span className="step-number">03</span><Leaf size={21} /><h3>Grow curiosity</h3><p>Anyone can scan, read, and share. No app or account needed.</p></article>
        </div>
      </section>
      <Footer />
    </>
  )
}

function Footer() {
  return <footer className="site-footer"><Link to="/" className="brand"><span className="brand-mark"><TreePine size={17} /></span><span>tree<span className="brand-light">qr</span></span></Link><span>Made for the love of trees <span className="footer-leaf">✳</span></span></footer>
}

function TreePage() {
  const { treeId } = useParams()
  const [loaded, setLoaded] = useState<{ id: string; tree: TreeRecord | null; error: string } | null>(null)
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)
  const [shareError, setShareError] = useState('')
  const [shareUrl, setShareUrl] = useState(window.location.href)
  const [imageIndex, setImageIndex] = useState(0)
  const routeId = treeId ?? ''
  const resolved = loaded?.id === routeId ? loaded : null
  const loading = Boolean(treeId) && !resolved
  const tree = resolved?.tree ?? null
  const error = treeId ? loading ? '' : resolved?.error ?? '' : 'This tree link is incomplete.'

  useEffect(() => {
    let active = true
    if (treeId) {
      getTree(decodeURIComponent(treeId))
        .then((result) => {
          if (active) setLoaded({
            id: treeId,
            tree: result,
            error: result ? '' : 'We couldn’t find this tree. It may have been removed.',
          })
        })
        .catch((reason: unknown) => {
          if (active) setLoaded({
            id: treeId,
            tree: null,
            error: reason instanceof Error ? reason.message : 'Unable to load this tree right now.',
          })
        })
    }
    return () => { active = false }
  }, [treeId])

  useEffect(() => {
    if (!treeId) return
    let active = true
    void getPublicTreeUrl(treeId).then(async (publicUrl) => {
      if (!active) return
      setShareUrl(publicUrl)
      try {
        const qrcode = await import('qrcode')
        const code = await qrcode.toDataURL(publicUrl, {
          width: 360,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: { dark: '#173f2b', light: '#ffffff' },
        })
        if (active) setQr(code)
      } catch {
        if (active) setQr('')
      }
    })
    return () => { active = false }
  }, [treeId])

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  async function shareTree() {
    const shareData = { title: `${tree?.commonName} | TreeQR`, text: `Meet the ${tree?.commonName}. A little more about this tree:`, url: shareUrl }
    try {
      setShareError('')
      if (navigator.share) await navigator.share(shareData)
      else await copyLink()
    } catch (reason) {
      if (reason instanceof Error && reason.name !== 'AbortError') setShareError('Sharing isn’t available right now. Try copying the link instead.')
    }
  }

  if (loading) return <><Header /><main className="loading-state"><LoaderCircle className="spin" size={28} /><p>Finding your tree...</p></main><Footer /></>
  if (!tree || error) return <><Header /><main className="not-found"><span className="not-found-icon"><TreePine size={28} /></span><h1>Tree not found</h1><p>{error}</p><Link className="button-primary" to="/"><ArrowLeft size={17} /> Back to TreeQR</Link></main><Footer /></>

  const image = tree.images[imageIndex] ?? tree.images[0]
  return (
    <>
      <Header />
      <main className="tree-page">
        <nav className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>{tree.commonName}</span></nav>
        <section className="tree-intro">
          <div className="tree-title">
            <span className="eyebrow"><span className="eyebrow-line" /> TREE FIELD NOTES</span>
            <h1>{tree.commonName}</h1>
            {tree.scientificName && <p className="scientific-name">{tree.scientificName}</p>}
            <p className="tree-lede">{tree.description || 'Explore the details available for this tree.'}</p>
            <div className="tree-meta">
              {tree.family && <span><Leaf size={15} /> {tree.family}</span>}
              {tree.origin && <span><MapPin size={15} /> {tree.origin}</span>}
            </div>
            <div className="share-actions">
              <button className="button-primary" onClick={() => void shareTree()}><Share2 size={16} /> Share this tree</button>
              <button className="button-secondary" onClick={() => void copyLink().catch(() => setShareError('Could not copy the link. Try sharing from your browser.'))}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied!' : 'Copy link'}</button>
            </div>
            {shareError && <p className="form-error" role="alert">{shareError}</p>}
          </div>
          <div className="tree-photo-wrap">
            {image ? <img className="tree-photo" src={image.url} alt={`${tree.commonName} tree`} /> : <div className="no-image"><TreePine size={46} /><span>No image available</span></div>}
            {tree.images.length > 1 && <div className="image-dots">{tree.images.map((item, index) => <button key={item.url} className={index === imageIndex ? 'active' : ''} onClick={() => setImageIndex(index)} aria-label={`View tree photo ${index + 1}`} />)}</div>}
            {image?.sourceUrl && <a className="photo-credit" href={image.sourceUrl} target="_blank" rel="noreferrer">{image.credit ? `Photo: ${image.credit} · Wikimedia Commons` : 'Photo source: Wikimedia Commons'}</a>}
          </div>
        </section>

        <section className="tree-facts" aria-label="Tree information">
          <div className="facts-heading"><div><span className="eyebrow"><span className="eyebrow-line" /> GET TO KNOW IT</span><h2>A closer look</h2></div><div className="source-links"><a href={tree.sourceUrl} target="_blank" rel="noreferrer" className="source-link">Wikipedia <ExternalLink size={14} /></a>{tree.wikidataUrl && <a href={tree.wikidataUrl} target="_blank" rel="noreferrer" className="source-link">Wikidata <ExternalLink size={14} /></a>}</div></div>
          <div className="facts-grid">
            {sections.map((section) => (
              <article className={`fact-card fact-${section.key}`} key={section.key}>
                <span className="fact-number">{section.icon}</span>
                <h3>{section.title}</h3>
                <p>{tree.details[section.key] || 'Not documented in the available source.'}</p>{section.key === 'medicinal' && <small className="fact-disclaimer">Traditional uses are botanical references, not medical advice or proof of safety or effectiveness.</small>}
              </article>
            ))}
            <article className="fact-card fact-taxonomy"><span className="fact-number">08</span><h3>Family & origin</h3><p><strong>Family</strong>{tree.family || 'Not documented in the available source.'}</p><p><strong>Origin</strong>{tree.origin || 'Not documented in the available source.'}</p></article>
          </div>
        </section>

        <section className="qr-panel">
          <div className="qr-copy"><span className="eyebrow"><span className="eyebrow-line" /> TAKE IT WITH YOU</span><h2>Good things<br />grow when shared.</h2><p>Save this QR code or send the link to someone who’d love to know this tree, too.</p><div className="qr-buttons"><a className="button-primary" href={qr || undefined} download={`treeqr-${tree.id}.png`}><Download size={16} /> Download QR</a><a className="button-secondary whatsapp-button" href={`https://wa.me/?text=${encodeURIComponent(`${tree.commonName} | ${shareUrl}`)}`} target="_blank" rel="noreferrer"><Share2 size={16} /> Share on WhatsApp</a></div></div>
          <div className="qr-code-card">{qr ? <img src={qr} alt={`QR code linking to ${tree.commonName}`} /> : <div className="qr-placeholder"><LoaderCircle className="spin" size={24} /></div>}<span>Scan to explore {tree.commonName}</span></div>
        </section>
      </main>
      <Footer />
    </>
  )
}

function App() {
  return <div className="app-shell min-h-screen bg-white text-stone-900"><Routes><Route path="/" element={<><Header /><HomePage /></>} /><Route path="/tree/:treeId" element={<TreePage />} /><Route path="*" element={<><Header /><main className="not-found"><h1>Page not found</h1><p>Let’s find our way back to the trees.</p><Link className="button-primary" to="/">Back to TreeQR</Link></main><Footer /></>} /></Routes></div>
}

export default App



