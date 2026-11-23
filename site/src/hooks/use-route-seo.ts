import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { SITE_URL, routeSeo } from '../constants/seo'

/** Finds (or adds) a head tag and sets one attribute on it. */
function upsertHead(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

function setMeta(key: 'name' | 'property', id: string, content: string) {
  upsertHead(
    `meta[${key}="${id}"]`,
    () => {
      const meta = document.createElement('meta')
      meta.setAttribute(key, id)
      return meta
    },
    'content',
    content,
  )
}

/** Keeps the document title, description, canonical, robots and social tags in step
 *  with the current route. index.html carries the home page's values for crawlers
 *  that don't run JavaScript; this updates them as the SPA navigates. */
export function useRouteSeo() {
  const { pathname } = useLocation()

  useEffect(() => {
    const seo = routeSeo(pathname)
    const url = `${SITE_URL}${seo.canonicalPath}`

    document.title = seo.title
    setMeta('name', 'description', seo.description)
    setMeta('name', 'robots', seo.index ? 'index, follow' : 'noindex, nofollow')
    setMeta('property', 'og:title', seo.title)
    setMeta('property', 'og:description', seo.description)
    setMeta('property', 'og:url', url)
    setMeta('name', 'twitter:title', seo.title)
    setMeta('name', 'twitter:description', seo.description)
    upsertHead(
      'link[rel="canonical"]',
      () => {
        const link = document.createElement('link')
        link.rel = 'canonical'
        return link
      },
      'href',
      url,
    )
  }, [pathname])
}
