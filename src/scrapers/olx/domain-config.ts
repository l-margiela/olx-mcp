import { DomainConfig, OlxDomain } from '../../core/types.js';

export const OLX_DOMAIN_CONFIGS: Record<OlxDomain, DomainConfig> = {
  'olx.pt': {
    domain: 'olx.pt',
    baseUrl: 'https://www.olx.pt',
    currency: 'EUR',
    language: 'pt',
    selectors: {
      search: {
        listingCard: '[data-cy="l-card"]',
        title: '[data-cy="ad-card-title"] h4',
        price: '[data-testid="ad-price"]',
        location: '[data-testid="location-date"]',
        image: 'img',
        link: 'a[href]',
        publishDate: '[data-testid="location-date"] span:last-child',
        nextPage: 'a[data-cy="pagination-forward"]',
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
    },
    urlPatterns: {
      searchPath: (location?: string, query?: string) => {
        let path = '';
        if (location) {
          const locationSlug = location.toLowerCase().replace(/\s+/g, '-');
          path += `/${locationSlug}`;
          if (query) {
            const querySlug = query
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');
            path += `/q-${querySlug}/`;
          } else {
            path += '/';
          }
        } else {
          path += '/ads/';
          if (query) {
            const querySlug = query
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');
            path += `q-${querySlug}/`;
          }
        }
        return path;
      },
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
    },
  },

  'olx.pl': {
    domain: 'olx.pl',
    baseUrl: 'https://www.olx.pl',
    currency: 'PLN',
    language: 'pl',
    selectors: {
      search: {
        listingCard: '[data-cy="l-card"]',
        title: '[data-cy="ad-card-title"] h4, [data-cy="ad-card-title"] h6',
        price: '[data-testid="ad-price"]',
        location: '[data-testid="location-date"]',
        image: 'img',
        link: 'a[href]',
        publishDate: '[data-testid="location-date"] span:last-child',
        nextPage: 'a[data-cy="pagination-forward"]',
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
    },
    urlPatterns: {
      searchPath: (location?: string, query?: string) => {
        let path = '';
        if (location) {
          const locationSlug = location
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/ą/g, 'a')
            .replace(/ć/g, 'c')
            .replace(/ę/g, 'e')
            .replace(/ł/g, 'l')
            .replace(/ń/g, 'n')
            .replace(/ó/g, 'o')
            .replace(/ś/g, 's')
            .replace(/ź/g, 'z')
            .replace(/ż/g, 'z');
          path += `/${locationSlug}`;
          if (query) {
            const querySlug = query
              .toLowerCase()
              .replace(/ą/g, 'a')
              .replace(/ć/g, 'c')
              .replace(/ę/g, 'e')
              .replace(/ł/g, 'l')
              .replace(/ń/g, 'n')
              .replace(/ó/g, 'o')
              .replace(/ś/g, 's')
              .replace(/ź/g, 'z')
              .replace(/ż/g, 'z')
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');
            path += `/q-${querySlug}/`;
          } else {
            path += '/';
          }
        } else {
          path += '/oferty/';
          if (query) {
            const querySlug = query
              .toLowerCase()
              .replace(/ą/g, 'a')
              .replace(/ć/g, 'c')
              .replace(/ę/g, 'e')
              .replace(/ł/g, 'l')
              .replace(/ń/g, 'n')
              .replace(/ó/g, 'o')
              .replace(/ś/g, 's')
              .replace(/ź/g, 'z')
              .replace(/ż/g, 'z')
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');
            path += `q-${querySlug}/`;
          }
        }
        return path;
      },
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
    },
  },

  'olx.bg': {
    domain: 'olx.bg',
    baseUrl: 'https://www.olx.bg',
    currency: 'BGN',
    language: 'bg',
    selectors: {
      search: {
        listingCard: '[data-cy="l-card"]',
        title: '[data-cy="ad-card-title"] h4, [data-cy="ad-card-title"] h6',
        price: '[data-testid="ad-price"]',
        location: '[data-testid="location-date"]',
        image: 'img',
        link: 'a[href]',
        publishDate: '[data-testid="location-date"] span:last-child',
        nextPage: 'a[data-cy="pagination-forward"]',
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
    },
    urlPatterns: {
      searchPath: (location?: string, query?: string) => {
        let path = '';
        if (location) {
          const locationSlug = location.toLowerCase().replace(/\s+/g, '-');
          path += `/${locationSlug}`;
          if (query) {
            const querySlug = query
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');
            path += `/q-${querySlug}/`;
          } else {
            path += '/';
          }
        } else {
          path += '/ads/';
          if (query) {
            const querySlug = query
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');
            path += `q-${querySlug}/`;
          }
        }
        return path;
      },
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
    },
  },

  'olx.ro': {
    domain: 'olx.ro',
    baseUrl: 'https://www.olx.ro',
    currency: 'RON',
    language: 'ro',
    selectors: {
      search: {
        listingCard: '[data-cy="l-card"]',
        title: '[data-cy="ad-card-title"] h4, [data-cy="ad-card-title"] h6',
        price: '[data-testid="ad-price"]',
        location: '[data-testid="location-date"]',
        image: 'img',
        link: 'a[href]',
        publishDate: '[data-testid="location-date"] span:last-child',
        nextPage: 'a[data-cy="pagination-forward"]',
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
    },
    urlPatterns: {
      searchPath: (location?: string, query?: string) => {
        let path = '';
        if (location) {
          const locationSlug = location
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/ă/g, 'a')
            .replace(/â/g, 'a')
            .replace(/î/g, 'i')
            .replace(/ș/g, 's')
            .replace(/ț/g, 't');
          path += `/${locationSlug}`;
          if (query) {
            const querySlug = query
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/ă/g, 'a')
              .replace(/â/g, 'a')
              .replace(/î/g, 'i')
              .replace(/ș/g, 's')
              .replace(/ț/g, 't')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');
            path += `/q-${querySlug}/`;
          } else {
            path += '/';
          }
        } else {
          path += '/ads/';
          if (query) {
            const querySlug = query
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/ă/g, 'a')
              .replace(/â/g, 'a')
              .replace(/î/g, 'i')
              .replace(/ș/g, 's')
              .replace(/ț/g, 't')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');
            path += `q-${querySlug}/`;
          }
        }
        return path;
      },
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
    },
  },

  'olx.ua': {
    domain: 'olx.ua',
    baseUrl: 'https://www.olx.ua',
    currency: 'UAH',
    language: 'uk',
    selectors: {
      search: {
        listingCard: '[data-cy="l-card"]',
        title: '[data-cy="ad-card-title"] h4, [data-cy="ad-card-title"] h6',
        price: '[data-testid="ad-price"]',
        location: '[data-testid="location-date"]',
        image: 'img',
        link: 'a[href]',
        publishDate: '[data-testid="location-date"] span:last-child',
        nextPage: 'a[data-cy="pagination-forward"]',
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
    },
    urlPatterns: {
      searchPath: (location?: string, query?: string) => {
        let path = '';
        if (location) {
          const locationSlug = location.toLowerCase().replace(/\s+/g, '-');
          path += `/${locationSlug}`;
          if (query) {
            const querySlug = query
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');
            path += `/q-${querySlug}/`;
          } else {
            path += '/';
          }
        } else {
          path += '/ads/';
          if (query) {
            const querySlug = query
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');
            path += `q-${querySlug}/`;
          }
        }
        return path;
      },
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
    },
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
