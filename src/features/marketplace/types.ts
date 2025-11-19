export type Category =
  | 'books'
  | 'electronics'
  | 'furniture'
  | 'clothing'
  | 'sports'
  | 'kitchen'
  | 'other';

// Shared item contract keeps marketplace browsing, posting, and backend writes in sync.
export interface Item {
  id: string;
  title: string;
  price: number; // USD
  condition: 'New' | 'Like New' | 'Excellent' | 'Good' | 'Fair';
  category: Category;
  imageUrls: string[];
  coverImageUrl?: string | null;
  location: string;
  postedAt: string; // ISO string
  sellerId: string;
  // Optional detail fields used on the item detail screen
  description?: string;
  seller?: {
    name: string;
    verified: boolean;
    rating: number;
  };
  // Optional preformatted posted date text (fallback uses postedAt)
  postedDate?: string;
}
