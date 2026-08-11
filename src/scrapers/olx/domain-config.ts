import { DomainConfig, DomainSelectors, OlxDomain } from '../../core/types.js';

/**
 * Every OLX country site is the same application with a different locale, so
 * the markup — and therefore every selector — is identical across domains.
 * Keeping one copy means a selector change is one edit, not five.
 */
const COMMON_SELECTORS: DomainSelectors = {
  search: {
    listingCard: '[data-cy="l-card"]',
    title: '[data-testid="ad-card-title"] h4, [data-testid="ad-card-title"] h6',
    price: '[data-testid="ad-price"]',
    location: '[data-testid="location-date"]',
    image: 'img',
    link: 'a[href]',
    publishDate: '[data-testid="location-date"] span:last-child',
    nextPage: '[data-testid="pagination-forward"]',
    totalCount: '[data-testid="total-count"]',
    noResults: '[data-cy="empty-state"]',
  },
  detail: {
    title: '[data-testid="offer_title"]',
    price: '[data-testid="ad-price-container"]',
    description: '[data-testid="ad_description"]',
    images: '.swiper-slide img',
    location: '[data-testid="map-aside-section"]',
    publishDate: '[data-testid="ad-posted-at"]',
    seller: {
      name: '[data-testid="user-profile-user-name"]',
      phone: '[data-testid="phones-container"]',
      verified: '[data-testid="trader-title"]',
      memberSince: '[data-testid="member-since"]',
    },
    category: '.breadcrumb-item:last-child',
    attributes: '[data-cy="ad-params"] li',
  },
};

/** Ordered replacements folding a language's diacritics down to ASCII. */
type DiacriticFolding = ReadonlyArray<readonly [RegExp, string]>;

const POLISH_FOLDING: DiacriticFolding = [
  [/ą/g, 'a'],
  [/ć/g, 'c'],
  [/ę/g, 'e'],
  [/ł/g, 'l'],
  [/ń/g, 'n'],
  [/ó/g, 'o'],
  [/ś/g, 's'],
  [/ź/g, 'z'],
  [/ż/g, 'z'],
];

const ROMANIAN_FOLDING: DiacriticFolding = [
  [/ă/g, 'a'],
  [/â/g, 'a'],
  [/î/g, 'i'],
  [/ș/g, 's'],
  [/ț/g, 't'],
];

const fold = (value: string, folding: DiacriticFolding): string =>
  folding.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);

/**
 * Folding runs before the non-ASCII strip, otherwise the strip would delete the
 * accented characters outright and the folding would never apply.
 */
const slugifyQuery = (query: string, folding: DiacriticFolding): string =>
  fold(query.toLowerCase(), folding)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const slugifyLocation = (location: string, folding: DiacriticFolding): string =>
  fold(location.toLowerCase().replace(/\s+/g, '-'), folding);

/**
 * OLX addresses searches either as /<location>/q-<query>/ or, with no location,
 * as <listingPath>q-<query>/ — where listingPath is the domain's "all ads" path.
 */
const buildSearchPath =
  (listingPath: string, folding: DiacriticFolding = []) =>
  (location?: string, query?: string): string => {
    if (location) {
      const base = `/${slugifyLocation(location, folding)}`;
      return query ? `${base}/q-${slugifyQuery(query, folding)}/` : `${base}/`;
    }
    return query ? `${listingPath}q-${slugifyQuery(query, folding)}/` : listingPath;
  };

/** Identical on every domain observed so far. */
const COMMON_URL_PARAMS = {
  priceParams: {
    min: 'search[filter_float_price:from]',
    max: 'search[filter_float_price:to]',
  },
  sortParams: {
    date: 'created_at:desc',
    'price-asc': 'filter_float_price:asc',
    'price-desc': 'filter_float_price:desc',
  },
  categoryParam: 'c',
  pageParam: 'page',
} as const;

export const OLX_DOMAIN_CONFIGS: Record<OlxDomain, DomainConfig> = {
  'olx.pt': {
    domain: 'olx.pt',
    baseUrl: 'https://www.olx.pt',
    currency: 'EUR',
    language: 'pt',
    selectors: COMMON_SELECTORS,
    urlPatterns: { searchPath: buildSearchPath('/ads/'), ...COMMON_URL_PARAMS },
  },

  'olx.pl': {
    domain: 'olx.pl',
    baseUrl: 'https://www.olx.pl',
    currency: 'PLN',
    language: 'pl',
    selectors: COMMON_SELECTORS,
    urlPatterns: { searchPath: buildSearchPath('/oferty/', POLISH_FOLDING), ...COMMON_URL_PARAMS },
  },

  'olx.bg': {
    domain: 'olx.bg',
    baseUrl: 'https://www.olx.bg',
    currency: 'BGN',
    language: 'bg',
    selectors: COMMON_SELECTORS,
    urlPatterns: { searchPath: buildSearchPath('/ads/'), ...COMMON_URL_PARAMS },
  },

  'olx.ro': {
    domain: 'olx.ro',
    baseUrl: 'https://www.olx.ro',
    currency: 'RON',
    language: 'ro',
    selectors: COMMON_SELECTORS,
    urlPatterns: { searchPath: buildSearchPath('/ads/', ROMANIAN_FOLDING), ...COMMON_URL_PARAMS },
  },

  'olx.ua': {
    domain: 'olx.ua',
    baseUrl: 'https://www.olx.ua',
    currency: 'UAH',
    language: 'uk',
    selectors: COMMON_SELECTORS,
    urlPatterns: { searchPath: buildSearchPath('/ads/'), ...COMMON_URL_PARAMS },
  },
};

export const getDomainConfig = (domain: OlxDomain): DomainConfig => {
  const config = OLX_DOMAIN_CONFIGS[domain];
  if (!config) {
    throw new Error(`Unsupported OLX domain: ${domain}`);
  }
  return config;
};

export const getSupportedDomains = (): OlxDomain[] => {
  return Object.keys(OLX_DOMAIN_CONFIGS) as OlxDomain[];
};

export const isDomainSupported = (domain: string): domain is OlxDomain => {
  return domain in OLX_DOMAIN_CONFIGS;
};
