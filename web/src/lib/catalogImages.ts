export type LocalCategory = "kids" | "teens" | "youth" | "adults" | "accessories";

// Includes former uploads + newly uploaded clothing images.
export const ALL_CLOTH_IMAGE_IDS = [
  1, 2, 8, 9, // former flatlay sets
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, // new uploads (clean only)
] as const;

const CATEGORY_IMAGE_IDS: Record<LocalCategory, number[]> = {
  kids: [11, 12, 14, 16, 18, 19, 21, 23],
  teens: [13, 15, 17, 20, 22, 23, 8],
  youth: [2, 9, 17, 20, 22, 23, 24],
  adults: [24, 25, 26, 2, 9],
  accessories: [1, 8, 9, 13, 15],
};

export function clothImageById(id: number) {
  return `/api/local-image?id=${id}`;
}

export function clothImageByIndex(index: number) {
  const id = ALL_CLOTH_IMAGE_IDS[index % ALL_CLOTH_IMAGE_IDS.length];
  return clothImageById(id);
}

export function categoryClothImage(category: LocalCategory, index: number) {
  const arr = CATEGORY_IMAGE_IDS[category];
  return clothImageById(arr[index % arr.length]);
}

export function clothPairByCategory(category: LocalCategory, index: number) {
  return {
    primary: categoryClothImage(category, index * 2),
    secondary: categoryClothImage(category, index * 2 + 1),
  };
}

