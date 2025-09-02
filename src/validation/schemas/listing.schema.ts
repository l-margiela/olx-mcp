import { z } from 'zod';

export const SearchListingsArgsSchema = z
  .object({
    domain: z.enum(['olx.pt', 'olx.pl', 'olx.bg', 'olx.ro', 'olx.ua']),
    query: z.string().min(1).max(100).optional(),
    category: z.string().optional(),
    location: z.string().optional(),
    minPrice: z.number().min(0).optional(),
    maxPrice: z.number().min(0).optional(),
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(50).default(20),
    sortBy: z.enum(['relevance', 'date', 'price-asc', 'price-desc']).default('relevance'),
  })
  .refine(data => !data.maxPrice || !data.minPrice || data.maxPrice >= data.minPrice, {
    message: 'Max price must be greater than or equal to min price',
    path: ['maxPrice'],
  })
  .refine(data => data.query || data.category || data.location, {
    message: 'At least one of query, category, or location must be provided',
    path: ['query'],
  });

export type SearchListingsArgs = z.infer<typeof SearchListingsArgsSchema>;

export const GetListingDetailsArgsSchema = z.object({
  domain: z.enum(['olx.pt', 'olx.pl', 'olx.bg', 'olx.ro', 'olx.ua']),
  listingId: z.string().min(1),
  includeImages: z.boolean().default(false),
  includeSellerInfo: z.boolean().default(true),
});

export type GetListingDetailsArgs = z.infer<typeof GetListingDetailsArgsSchema>;

export const GetCategoriesArgsSchema = z.object({
  parentId: z.string().optional(),
  includeSubcategories: z.boolean().default(true),
  maxDepth: z.number().min(1).max(3).default(2),
});

export type GetCategoriesArgs = z.infer<typeof GetCategoriesArgsSchema>;

export const GetLocationsArgsSchema = z.object({
  searchTerm: z.string().optional(),
  parentId: z.string().optional(),
  type: z.enum(['district', 'municipality', 'parish']).optional(),
  limit: z.number().min(1).max(100).default(20),
});

export type GetLocationsArgs = z.infer<typeof GetLocationsArgsSchema>;

export const ListingSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.string().optional(),
  location: z.string().optional(),
  category: z.string().optional(),
  imageUrl: z.string().url().optional(),
  url: z.string().url(),
  publishedAt: z.date().optional(),
  description: z.string().optional(),
  seller: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
      verified: z.boolean().optional(),
      memberSince: z.date().optional(),
    })
    .optional(),
});

export const SearchResultSchema = z.object({
  listings: z.array(ListingSchema),
  totalCount: z.number().min(0),
  currentPage: z.number().min(1),
  totalPages: z.number().min(1),
  hasNextPage: z.boolean(),
});

export const CategorySchema: z.ZodType<{
  id: string;
  name: string;
  slug: string;
  parentId?: string | undefined;
  subcategories?:
    | {
        id: string;
        name: string;
        slug: string;
        parentId?: string | undefined;
        subcategories?: any;
      }[]
    | undefined;
}> = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  parentId: z.string().optional(),
  subcategories: z.array(z.lazy(() => CategorySchema)).optional(),
});

export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  parentId: z.string().optional(),
  type: z.enum(['district', 'municipality', 'parish']),
});
