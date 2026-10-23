import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

type Filters = { countries: Set<string>; options: Set<string>; query: string; sort: string }
function resolve<T>(value: SetStateAction<T>, previous: T): T {
  return typeof value === 'function' ? (value as (previous: T) => T)(previous) : value
}

/** Applied filters live in the URL, so refresh, navigation and returning from detail agree. */
export function useCatalogFilters(basePath: string, countrySlugs: Record<string, string>, optionKey: string) {
  const location = useLocation()
  const navigate = useNavigate()
  const filters = useMemo<Filters>(() => {
    const params = new URLSearchParams(location.search)
    const country = Object.keys(countrySlugs).find(c => `${basePath}/${countrySlugs[c]}` === location.pathname)
    return {
      countries: new Set(country ? [country] : params.getAll('country')),
      options: new Set(params.getAll(optionKey)),
      query: params.get('q') || '',
      sort: params.get('sort') || 'default',
    }
  }, [location.pathname, location.search, basePath, countrySlugs, optionKey])
  const pending = useRef(filters)
  // Preserve updates issued together in one event until Router renders the resulting URL.
  const rendered = useRef(filters)
  if (rendered.current !== filters) { rendered.current = filters; pending.current = filters }
  const update = useCallback((patch: (previous: Filters) => Filters) => {
    const next = patch(pending.current)
    pending.current = next
    const countries = [...next.countries]
    const singleSlug = countries.length === 1 ? countrySlugs[countries[0]] : undefined
    const pathname = singleSlug ? `${basePath}/${singleSlug}` : basePath
    const params = new URLSearchParams()
    if (!singleSlug) countries.forEach(c => params.append('country', c))
    next.options.forEach(o => params.append(optionKey, o))
    if (next.query) params.set('q', next.query)
    if (next.sort !== 'default') params.set('sort', next.sort)
    const search = params.toString()
    navigate({ pathname, search: search ? `?${search}` : '' }, { replace: true })
  }, [navigate, basePath, countrySlugs, optionKey])
  const [searchQuery, setDraft] = useState(filters.query)
  useEffect(() => { setDraft(filters.query) }, [filters.query, location.pathname])
  const setSearchFilter = useCallback((query: string) => update(prev => ({ ...prev, query: query.trim() })), [update])
  const setSearchQuery = useCallback((query: string) => {
    setDraft(query)
    if (!query.trim() && pending.current.query) setSearchFilter('')
  }, [setSearchFilter])
  return {
    selectedCountries: filters.countries,
    setSelectedCountries: (value: SetStateAction<Set<string>>) => update(prev => ({ ...prev, countries: resolve(value, prev.countries) })),
    selectedOptions: filters.options,
    setSelectedOptions: (value: SetStateAction<Set<string>>) => update(prev => ({ ...prev, options: resolve(value, prev.options) })),
    searchFilter: filters.query, setSearchFilter, searchQuery, setSearchQuery,
    sortMode: filters.sort,
    setSortMode: (value: SetStateAction<string>) => update(prev => ({ ...prev, sort: resolve(value, prev.sort) })),
  }
}

type SearchableItem = {
  country: string; countryEn: string; name: string; nameEn: string;
  city?: string; cityEn?: string; tagline?: string; location?: string; locationEn?: string;
}
/** Shared by visible results, scoped suggestions and mobile preview counts. */
export function matchesCatalogItem(item: SearchableItem, options: string[], countries: ReadonlySet<string>, selectedOptions: ReadonlySet<string>, query = '') {
  if (countries.size && !countries.has(item.country)) return false
  if (selectedOptions.size && !options.some(option => selectedOptions.has(option))) return false
  const q = query.trim().toLowerCase()
  return !q || [item.name, item.nameEn, item.country, item.countryEn, item.city, item.cityEn, item.tagline, item.location, item.locationEn, ...options]
    .some(value => value?.toLowerCase().includes(q))
}
