import type { Item } from '../types';

const now = Date.now();
const ago = (mins: number) => new Date(now - mins * 60_000).toISOString();

// sample set
export const MOCK_LISTINGS: Item[] = [
  { id: '1', title: 'Calculus (Stewart) 8th Ed.', price: 45, condition: 'Good', category: 'books', imageUrl: null, location: 'College Library', postedAt: ago(25), sellerId: 'u1' },
  { id: '2', title: 'Mini Fridge (3.2 cu ft)', price: 80, condition: 'Like New', category: 'furniture', imageUrl: null, location: 'Sellery Hall', postedAt: ago(75), sellerId: 'u2' },
  { id: '3', title: 'Desk Lamp w/ USB', price: 15, condition: 'Good', category: 'electronics', imageUrl: null, location: 'Union South', postedAt: ago(8), sellerId: 'u3' },
  { id: '4', title: 'UW Hoodie (M)', price: 25, condition: 'Excellent', category: 'clothing', imageUrl: null, location: 'Gordon Ave', postedAt: ago(180), sellerId: 'u4' },
  { id: '5', title: 'Bike Lock (U-lock)', price: 12, condition: 'Good', category: 'other', imageUrl: null, location: 'Lakeshore Path', postedAt: ago(12), sellerId: 'u5' },
  { id: '6', title: 'Microwave 700W', price: 60, condition: 'Good', category: 'electronics', imageUrl: null, location: 'Zwirski House', postedAt: ago(320), sellerId: 'u6' },
  { id: '7', title: 'Linear Algebra Textbook', price: 35, condition: 'Like New', category: 'books', imageUrl: null, location: 'Memorial Library', postedAt: ago(55), sellerId: 'u7' },
  { id: '8', title: 'IKEA Study Chair', price: 40, condition: 'Good', category: 'furniture', imageUrl: null, location: 'Lucky Apts', postedAt: ago(10), sellerId: 'u8' },
  { id: '9', title: 'Winter Jacket (W S)', price: 50, condition: 'Excellent', category: 'clothing', imageUrl: null, location: 'State St', postedAt: ago(260), sellerId: 'u9' },
  { id: '10', title: 'Graphing Calculator TI-84', price: 49, condition: 'Good', category: 'electronics', imageUrl: null, location: 'Engineering Hall', postedAt: ago(6), sellerId: 'u10' },
  { id: '11', title: 'Dorm Storage Bin Set (3)', price: 18, condition: 'Good', category: 'other', imageUrl: null, location: 'Dejope', postedAt: ago(95), sellerId: 'u11' },
  { id: '12', title: 'Intro to Algorithms (CLRS)', price: 55, condition: 'Like New', category: 'books', imageUrl: null, location: 'Wendt Library', postedAt: ago(420), sellerId: 'u12' },
];

export const getItemById = (id: string) => MOCK_LISTINGS.find(i => i.id === id) ?? null;
