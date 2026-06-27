export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  image: string;
  images: string[];
  features: string[];
  category: string;
  thumbnail?: string;
}
