export type Category =
  | 'books'
  | 'electronics'
  | 'furniture'
  | 'clothing'
  | 'sports'
  | 'kitchen'
  | 'other';

export interface Item {
  id: string;
  title: string;
  price: number;
  category: Category;
  condition: string;
  location: string;
  description: string;

  // cover image (used on cards)
  imageUrl: string;

  // full gallery (used on detail screen)
  imageUrls?: string[];

  // who posted it
  sellerId: string;

  // Firestore timestamp converted to Date | null in our mapping
  postedAt: Date | null;
}
