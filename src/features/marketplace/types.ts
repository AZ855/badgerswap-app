export type Category = 'books' | 'electronics' | 'furniture' | 'clothing' | 'other';

export interface Item {
  id: string;
  title: string;
  price: number; // USD
  condition: 'New' | 'Like New' | 'Excellent' | 'Good' | 'Fair';
  category: Category;
  imageUrl?: string | null; // placeholder
  location: string;
  postedAt: string;
  sellerId: string;
  // Optional detail fields used on the item detail screen
  description?: string;
  images?: (string | null)[];
  seller?: {
    name: string;
    verified: boolean;
    rating: number;
  };
  // Optional preformatted posted date text (fallback uses postedAt)
  postedDate?: string;
}
