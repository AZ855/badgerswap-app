import type { Category, Item } from '../marketplace/types';
import { createListing } from './api';
import { uploadImageAsync } from './cloudinary';

export type ListingImageSource = {
  localUri?: string | null;
  remoteUrl?: string | null;
};

export interface PublishListingInput {
  title: string;
  price: number;
  category: Category;
  condition: Item['condition'];
  description: string;
  location: string;
  images: ListingImageSource[];
  sellerName: string;
  userId: string;
}

// High-level command that uploads photos (Cloudinary) and persists the final listing (Firestore).
export async function publishListing(input: PublishListingInput): Promise<Item> {
  const uploadedUrls = await Promise.all(
    input.images.map(async (image) => {
      if (image.remoteUrl) {
        return image.remoteUrl;
      }
      if (image.localUri) {
        return uploadImageAsync(image.localUri);
      }
      throw new Error('Image source missing local or remote URI.');
    })
  );

  return createListing(
    {
      title: input.title.trim(),
      price: input.price,
      category: input.category,
      condition: input.condition,
      description: input.description.trim(),
      location: input.location,
      imageUrls: uploadedUrls,
      sellerName: input.sellerName,
    },
    input.userId
  );
}
