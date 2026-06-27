import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '../types';

interface OrderData {
  cus_name: string;
  cus_num1: string;
  cus_num2?: string;
  capetel: string;
  city?: string;
  address: string;
  item_id: number;
  all_price: number;
  count: number;
  note?: string;
  ip?: string;
}

export interface Category {
  id: number | string;
  name: string;
}

interface ApiContextType {
  categories: Category[];
  products: Product[];
  isLoadingCategories: boolean;
  isLoadingProducts: boolean;
  error: string | null;
  fetchProducts: (categoryId?: string | number, search?: string, page?: number, limit?: number) => Promise<void>;
  searchProductsAPI: (searchQuery: string, limit?: number) => Promise<Product[]>;
  fetchProductDetails: (id: string | number, isStrung?: boolean) => Promise<Product | null>;
  submitOrder: (orderData: OrderData) => Promise<any>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

const BASE_URL = 'https://rolemall.com';
const TOKEN = import.meta.env.VITE_TOKEN || 'zXxpdGv';

// Helper to map API product to our Product interface
  const mapApiProduct = (apiProduct: any): Product => {
    let image = 'https://picsum.photos/seed/placeholder/600/600';
    let images: string[] = [];

    if (Array.isArray(apiProduct.img) && apiProduct.img.length > 0) {
      image = apiProduct.img[0];
      images = apiProduct.img;
    } else if (typeof apiProduct.img === 'string' && apiProduct.img.trim() !== '') {
      image = apiProduct.img;
      images = [apiProduct.img];
    } else if (Array.isArray(apiProduct.images) && apiProduct.images.length > 0) {
      image = apiProduct.images[0];
      images = apiProduct.images;
    } else if (typeof apiProduct.image === 'string' && apiProduct.image.trim() !== '') {
      image = apiProduct.image;
      images = [apiProduct.image];
    } else if (typeof apiProduct.thumbnail === 'string' && apiProduct.thumbnail.trim() !== '') {
      image = apiProduct.thumbnail;
      images = [apiProduct.thumbnail];
    }

    // Ensure images array is never empty if we have an image
    if (images.length === 0 && image !== 'https://picsum.photos/seed/placeholder/600/600') {
      images = [image];
    } else if (images.length === 0) {
      images = ['https://picsum.photos/seed/placeholder/600/600'];
    }

    const parsePrice = (val: any) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const parsed = Number(val.replace(/,/g, ''));
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };
    
    // As per user request, pricing should match the shop link exactly. The shop typically uses price_of_sell or price. 
    // We prioritize price_of_sell if available.
    let productPrice = apiProduct.price_of_sell !== undefined && apiProduct.price_of_sell !== null 
      ? parsePrice(apiProduct.price_of_sell) 
      : parsePrice(apiProduct.price);

    return {
      id: apiProduct._id || apiProduct.id || apiProduct.product_id || apiProduct.item_id,
      name: apiProduct.name || apiProduct.title || 'بدون اسم',
      description: apiProduct.description || apiProduct.desc || apiProduct.body || 'لا يوجد وصف',
      price: productPrice,
      oldPrice: apiProduct.old_price ? parsePrice(apiProduct.old_price) : undefined,
      image,
      images,
      features: Array.isArray(apiProduct.features) ? apiProduct.features : [],
      category: apiProduct.category || apiProduct.category_name || 'غير مصنف',
      thumbnail: `https://wsrv.nl/?url=${encodeURIComponent(image)}&w=250&output=webp&q=60`,
    };
  };

export const ApiProvider = ({ children }: { children: ReactNode }) => {
  const [categories, setCategories] = useState<Category[]>([{ id: 'all', name: 'احدث المنتجات' }]);
  const hasFetchedCategories = React.useRef(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsCache, setProductsCache] = useState<Record<string, Product[]>>({});
  const inProgressProductFetches = React.useRef<Set<string>>(new Set());
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    if (hasFetchedCategories.current) return;
    hasFetchedCategories.current = true;
    
    setIsLoadingCategories(true);
    
    const localStorageKey = 'rolemall_categories';
    try {
      const cached = localStorage.getItem(localStorageKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 60 * 60 * 1000) { // 1 hour cache
          setCategories(data);
          setError(null);
          setIsLoadingCategories(false);
          return;
        }
      }
    } catch (e) {
      console.error('Error reading categories from localStorage', e);
    }

    try {
      let url = `${BASE_URL}/api/categories`;
      if (TOKEN) {
        url += `?token=${TOKEN}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch categories: ${res.status} ${text}`);
      }
      const data = await res.json();
      
      let cats: Category[] = [];
      if (Array.isArray(data)) {
        cats = data.map((c, index) => {
          if (typeof c === 'string') return { id: c, name: c };
          return { id: c._id || c.id || index, name: c.name || c.title || 'بدون اسم' };
        });
      } else if (data.data && Array.isArray(data.data)) {
        cats = data.data.map((c: any, index: number) => {
          if (typeof c === 'string') return { id: c, name: c };
          return { id: c._id || c.id || index, name: c.name || c.title || 'بدون اسم' };
        });
      } else if (data.data && data.data.categories && Array.isArray(data.data.categories)) {
        cats = data.data.categories.map((c: any, index: number) => {
          if (typeof c === 'string') return { id: c, name: c };
          return { id: c._id || c.id || index, name: c.name || c.title || 'بدون اسم' };
        });
      } else if (data.categories && Array.isArray(data.categories)) {
        cats = data.categories.map((c: any, index: number) => {
          if (typeof c === 'string') return { id: c, name: c };
          return { id: c._id || c.id || index, name: c.name || c.title || 'بدون اسم' };
        });
      }
      
      const HARDCODED_CATEGORIES = [
        { id: 26, name: "ادوات مطبخ" },
        { id: 25, name: "ادوات منزلية" },
        { id: 24, name: "انارة واضاءة" },
        { id: 23, name: "اثاث" },
        { id: 22, name: "ادوات رياضية" },
        { id: 21, name: "عدد وادوات" },
        { id: 20, name: "ادوات السيارات" },
        { id: 19, name: "العاب" },
        { id: 18, name: "منتجات العناية" },
        { id: 12, name: "اجهزة العناية" },
        { id: 6, name: "اجهزة المطبخ" },
        { id: 5, name: "اجهزة المنزل" },
        { id: 1, name: "الكترونيات" }
      ];

      const allCatNames = new Set(cats.map(c => c.name));
      HARDCODED_CATEGORIES.forEach(cat => {
        if (!allCatNames.has(cat.name)) {
          cats.push(cat);
        }
      });
      
      const finalCats = [{ id: 'all', name: 'احدث المنتجات' }, ...cats];
      setCategories(finalCats);

      try {
        localStorage.setItem(localStorageKey, JSON.stringify({
          data: finalCats,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.error('Error writing categories to localStorage', e);
      }
    } catch (err: any) {
      console.error('Error fetching categories:', err);

      try {
        const cached = localStorage.getItem(localStorageKey);
        if (cached) {
          const { data } = JSON.parse(cached);
          setCategories(data);
          setError(null);
          setIsLoadingCategories(false);
          return;
        }
      } catch (e) {}

      setError(err.message);
      hasFetchedCategories.current = false; // Allow retry on error
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const fetchProducts = React.useCallback(async (categoryId?: string | number, search?: string, page: number = 1, limit: number = 100) => {
    const cacheKey = `${categoryId || 'all'}-${search || ''}-${page}-${limit}`;
    const localStorageKey = `rolemall_products_${cacheKey}`;
    
    if (productsCache[cacheKey]) {
      setProducts(productsCache[cacheKey]);
      setError(null);
      setIsLoadingProducts(false);
      return;
    }

    // Check localStorage cache first
    try {
      const cached = localStorage.getItem(localStorageKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Use cache if it's less than 5 minutes old
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setProductsCache(prev => ({ ...prev, [cacheKey]: data }));
          setProducts(data);
          setError(null);
          setIsLoadingProducts(false);
          return;
        }
      }
    } catch (e) {
      console.error('Error reading from localStorage', e);
    }

    if (inProgressProductFetches.current.has(cacheKey)) {
      return; // Prevent duplicate concurrent fetches
    }
    inProgressProductFetches.current.add(cacheKey);

    setIsLoadingProducts(true);
    setError(null);
    try {
      let url = `${BASE_URL}/api/products?page=${page}&limit=${limit}`;
      if (TOKEN) {
        url += `&token=${TOKEN}`;
      }
      
      if (categoryId && categoryId !== 'all' && categoryId !== 'احدث المنتجات') {
        const isNumeric = !isNaN(Number(categoryId)) && String(categoryId).trim() !== '';
        if (isNumeric) {
          url += `&category=${encodeURIComponent(categoryId.toString())}`;
        } else if (!search) {
          // If it's a string category and no search term is provided, use it as a search term
          url += `&search=${encodeURIComponent(categoryId.toString())}`;
        }
      }
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch products: ${res.status} ${text}`);
      }
      const data = await res.json();
      
      let apiProducts: any[] = [];
      if (Array.isArray(data)) {
        apiProducts = data;
      } else if (data.data && Array.isArray(data.data)) {
        apiProducts = data.data;
      } else if (data.data && data.data.products && Array.isArray(data.data.products)) {
        apiProducts = data.data.products;
      } else if (data.products && Array.isArray(data.products)) {
        apiProducts = data.products;
      }

      const mappedProducts = apiProducts.map(mapApiProduct);
      setProductsCache(prev => ({ ...prev, [cacheKey]: mappedProducts }));
      setProducts(mappedProducts);
      
      // Save to localStorage
      try {
        localStorage.setItem(localStorageKey, JSON.stringify({
          data: mappedProducts,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.error('Error writing to localStorage', e);
      }

    } catch (err: any) {
      console.error('Error fetching products:', err);
      
      // Fallback to expired cache if available
      try {
        const cached = localStorage.getItem(localStorageKey);
        if (cached) {
          const { data } = JSON.parse(cached);
          setProductsCache(prev => ({ ...prev, [cacheKey]: data }));
          setProducts(data);
          // Don't set error since we loaded cached data
          return;
        }
      } catch (e) {}

      setError(err.message);
    } finally {
      setIsLoadingProducts(false);
      inProgressProductFetches.current.delete(cacheKey);
    }
  }, [productsCache]);

  const searchProductsAPI = React.useCallback(async (searchQuery: string, limit: number = 30): Promise<Product[]> => {
    if (!searchQuery.trim()) return [];
    
    try {
      let url = `${BASE_URL}/api/products?page=1&limit=${limit}`;
      if (TOKEN) {
        url += `&token=${TOKEN}`;
      }
      url += `&search=${encodeURIComponent(searchQuery)}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        return [];
      }
      const data = await res.json();
      
      let apiProducts: any[] = [];
      if (Array.isArray(data)) {
        apiProducts = data;
      } else if (data.data && Array.isArray(data.data)) {
        apiProducts = data.data;
      } else if (data.data && data.data.products && Array.isArray(data.data.products)) {
        apiProducts = data.data.products;
      } else if (data.products && Array.isArray(data.products)) {
        apiProducts = data.products;
      }

      return apiProducts.map(mapApiProduct);
    } catch (err) {
      console.error('Error searching products API:', err);
      return [];
    }
  }, []);

  const productDetailsCache = React.useRef<Record<string, Product>>({});
  const inProgressDetailFetches = React.useRef<Set<string>>(new Set());

  const fetchProductDetails = React.useCallback(async (id: string | number, isStrung: boolean = false): Promise<Product | null> => {
    const cacheKey = `${id}-${isStrung}`;
    const localStorageKey = `rolemall_product_${cacheKey}`;
    
    if (productDetailsCache.current[cacheKey]) {
      return productDetailsCache.current[cacheKey];
    }

    // Try localStorage
    try {
      const cached = localStorage.getItem(localStorageKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 60 * 60 * 1000) { // 1 hour
          productDetailsCache.current[cacheKey] = data;
          return data;
        }
      }
    } catch (e) {}

    // Also look in global products list to avoid fetching if possible
    const existingProduct = products.find(p => p.id === id || p.id === Number(id) || p.id === String(id));
    if (existingProduct) {
      productDetailsCache.current[cacheKey] = existingProduct;
      // Also cache it
      try {
        localStorage.setItem(localStorageKey, JSON.stringify({
          data: existingProduct,
          timestamp: Date.now()
        }));
      } catch (e) {}
      return existingProduct;
    }

    if (inProgressDetailFetches.current.has(cacheKey)) {
      // Return null or throw if fetching concurrently
    }
    inProgressDetailFetches.current.add(cacheKey);

    try {
      let url = `${BASE_URL}/api/product-details?strung=${TOKEN}gootquality${id}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch product details: ${res.status} ${text}`);
      }
      const data = await res.json();
      
      let productData = data;
      if (data.data) {
        if (data.data.product) {
          productData = data.data.product;
        } else {
          productData = data.data;
        }
      } else if (data.product) {
        productData = data.product;
      }

      const mappedProduct = mapApiProduct(productData);
      
      productDetailsCache.current[cacheKey] = mappedProduct;
      
      try {
        localStorage.setItem(localStorageKey, JSON.stringify({
          data: mappedProduct,
          timestamp: Date.now()
        }));
      } catch (e) {}

      return mappedProduct;
    } catch (err) {
      console.error('Error fetching product details:', err);
      // Fallback
      try {
        const cached = localStorage.getItem(localStorageKey);
        if (cached) {
          const { data } = JSON.parse(cached);
          productDetailsCache.current[cacheKey] = data;
          return data;
        }
      } catch (e) {}
      return null;
    } finally {
      inProgressDetailFetches.current.delete(cacheKey);
    }
  }, [products]);

  const submitOrder = async (orderData: OrderData) => {
    try {
      // 1. Submit to Supplier API (Rolemall) - BYPASSED: Order is processed locally and not sent to affiliate
      const responseData = { 
        success: true, 
        data: { 
          order_id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          message: "Order processed locally" 
        } 
      };

      // 2. Submit to Google Sheets Webhook in the background
      const sheetWebhookUrl = "https://script.google.com/macros/s/AKfycbw7HnvfUsq85RdA3lFkmKM6whdhObeuCAf5gVlEoo4KEaeDN7cYAgge-5Z1W3zPjnmDUg/exec";
      if (sheetWebhookUrl) {
        const formData = new URLSearchParams();
        formData.append('productName', orderData.note ? orderData.note.split('(الكمية')[0].replace(/.*الطلب الفعلي: /, '') : "");
        formData.append('name', orderData.cus_name);
        formData.append('phone', orderData.cus_num1);
        formData.append('governorate', orderData.capetel);
        formData.append('address', orderData.address);
        formData.append('productId', orderData.item_id.toString());
        formData.append('quantity', orderData.count.toString());
        formData.append('totalPrice', orderData.all_price.toString());
        formData.append('notes', orderData.note || "");
        formData.append('date', new Date().toLocaleString('ar-IQ'));

        fetch(sheetWebhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString()
        }).catch(err => console.error("Error sending to sheet webhook:", err));
      }

      // 3. Submit to Telegram Bot in the background
      const telegramBotToken = "7511209345:AAGoGxgr7GYMIc1lgQr8JoAWgeXevQAHor8";
      const telegramChatId = "252464127";
      if (telegramBotToken && telegramChatId) {
        const foundProduct = products.find(p => p.id.toString() === orderData.item_id.toString());
        const displayProductName = foundProduct 
          ? foundProduct.name 
          : (orderData.note ? orderData.note.split('(الكمية')[0].replace(/.*الطلب الفعلي: /, '').trim() : `المنتج #${orderData.item_id}`);
        
        const telegramMessage = `📦 طلب جديد\n\nالمنتج: ${displayProductName}\n\nالاسم: ${orderData.cus_name}\n\nالهاتف: ${orderData.cus_num1}\n\nالمحافظة: ${orderData.capetel}\n\nالعنوان: ${orderData.address}\n\nالعدد: ${orderData.count}\n\nالمبلغ الإجمالي: ${orderData.all_price.toLocaleString()} د.ع`;
        
        fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: telegramMessage
          })
        }).catch(err => console.error("Error sending to Telegram:", err));
      }

      // We cannot securely send CAPI from the frontend, but standard client-side Meta Pixel works.

      return responseData;
    } catch (err: any) {
      console.error('Error submitting order:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <ApiContext.Provider value={{ 
      categories, 
      products, 
      isLoadingCategories, 
      isLoadingProducts, 
      error, 
      fetchProducts, 
      searchProductsAPI,
      fetchProductDetails,
      submitOrder
    }}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};
