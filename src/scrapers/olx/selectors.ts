export const OLX_SELECTORS = {
  search: {
    listingCard: '[data-cy="l-card"]',
    title: '[data-cy="ad-card-title"] h4',
    price: '[data-testid="ad-price"]',
    location: '[data-testid="location-date"]',
    image: 'img',
    link: 'a[href]',
    publishDate: '[data-testid="location-date"] span:last-child',

    // Pagination
    nextPage: 'a[data-cy="pagination-forward"]',
    totalCount: '[data-testid="total-count"]',

    // No results
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

    // Additional details
    category: '.breadcrumb-item:last-child',
    attributes: '[data-cy="ad-params"] li',
  },

  categories: {
    categoryList: '.category-list-item',
    categoryLink: '.category-list-item a',
    categoryName: '.category-list-item a span',
    subcategoryToggle: '.category-list-item .toggle-subcategories',
  },

  locations: {
    locationList: '.location-list-item',
    locationLink: '.location-list-item a',
    locationName: '.location-list-item a span',
  },

  filters: {
    categoryFilter: '#categoryId',
    locationFilter: '#regionId',
    minPriceFilter: '#filter_float_price\\:from',
    maxPriceFilter: '#filter_float_price\\:to',
    sortSelect: '[data-cy="sort-by"]',
  },

  common: {
    loadingSpinner: '.loading-spinner',
    errorMessage: '.error-message',
  },
} as const;
