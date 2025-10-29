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
}