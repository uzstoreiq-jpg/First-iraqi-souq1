import { Handler } from "@netlify/functions";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Paths for persistent local backup files in /tmp (AWS Lambda writable dir)
const CATEGORIES_BACKUP_PATH = "/tmp/categories_backup.json";
const PRODUCTS_BACKUP_PATH = "/tmp/products_backup.json";

// In-memory cache fallback to avoid excessive disk reads
let inMemoryCategories: any = null;
let inMemoryProducts: Record<string, any> = {};

// Helper to resolve file paths across environment packaging
function getFilePath(filename: string): string {
  const cwdPath = path.join(process.cwd(), filename);
  if (fs.existsSync(cwdPath)) return cwdPath;
  
  const dirPath = path.join(__dirname, filename);
  if (fs.existsSync(dirPath)) return dirPath;
  
  const parentPath = path.join(__dirname, "..", filename);
  if (fs.existsSync(parentPath)) return parentPath;

  const parentParentPath = path.join(__dirname, "..", "..", filename);
  if (fs.existsSync(parentParentPath)) return parentParentPath;

  return cwdPath;
}

// Helper to load backups from disk on startup
function loadBackupsFromDisk() {
  const CATEGORIES_STATIC_PATH = getFilePath("categories_static_fallback.json");
  const PRODUCTS_STATIC_PATH = getFilePath("products_static_fallback.json");

  // 1. Try loading Categories (Dynamic Cache first, then Static Fallback)
  try {
    if (fs.existsSync(CATEGORIES_BACKUP_PATH)) {
      const data = fs.readFileSync(CATEGORIES_BACKUP_PATH, "utf8");
      inMemoryCategories = JSON.parse(data);
      console.log("🟢 [CAPI Function] Loaded categories runtime backup successfully.");
    } else if (fs.existsSync(CATEGORIES_STATIC_PATH)) {
      const data = fs.readFileSync(CATEGORIES_STATIC_PATH, "utf8");
      inMemoryCategories = JSON.parse(data);
      console.log("🔵 [CAPI Function] Loaded categories static fallback successfully.");
    } else {
      console.warn("⚠️ [CAPI Function] No categories static fallback found at path:", CATEGORIES_STATIC_PATH);
    }
  } catch (err) {
    console.error("❌ [CAPI Function] Error loading categories backup:", err);
  }

  // 2. Try loading Products (Dynamic Cache first, then Static Fallback)
  try {
    if (fs.existsSync(PRODUCTS_BACKUP_PATH)) {
      const data = fs.readFileSync(PRODUCTS_BACKUP_PATH, "utf8");
      inMemoryProducts = JSON.parse(data);
      console.log("🟢 [CAPI Function] Loaded products runtime backup successfully.");
    } else if (fs.existsSync(PRODUCTS_STATIC_PATH)) {
      const data = fs.readFileSync(PRODUCTS_STATIC_PATH, "utf8");
      const staticData = JSON.parse(data);
      inMemoryProducts = { all: staticData };
      console.log("🔵 [CAPI Function] Loaded products static fallback successfully.");
    } else {
      console.warn("⚠️ [CAPI Function] No products static fallback found at path:", PRODUCTS_STATIC_PATH);
    }
  } catch (err) {
    console.error("❌ [CAPI Function] Error loading products backup:", err);
  }
}

// Call loadBackupsFromDisk on initialization
loadBackupsFromDisk();

// Dynamic Seeding: Fetch fresh real categories and products from affiliate API
async function seedStaticBackups() {
  const CATEGORIES_STATIC_PATH = getFilePath("categories_static_fallback.json");
  const PRODUCTS_STATIC_PATH = getFilePath("products_static_fallback.json");
  const token = process.env.SUPPLIER_API_TOKEN || process.env.VITE_TOKEN || "zXxpdGv";

  console.log("🔄 [CAPI Function Seeding] Fetching fresh real categories and products...");
  
  try {
    const catRes = await fetch("https://rolemall.com/api/categories/");
    if (catRes.ok) {
      const catData = await catRes.json();
      fs.writeFileSync(CATEGORIES_STATIC_PATH, JSON.stringify(catData, null, 2), "utf8");
      console.log("✅ [Seeding] Successfully updated categories_static_fallback.json");
    }
  } catch (err) {
    console.error("❌ [Seeding] Failed to seed categories:", err);
  }

  try {
    let allProducts: any[] = [];
    let page = 1;
    let totalPages = 1;
    let limit = 100;
    let apiResponseTemplate: any = null;

    const firstPageUrl = `https://rolemall.com/api/products/?token=${token}&limit=${limit}&page=${page}`;
    const prodRes = await fetch(firstPageUrl);
    if (prodRes.ok) {
      apiResponseTemplate = await prodRes.json();
      let firstPageProducts: any[] = [];
      
      if (apiResponseTemplate && apiResponseTemplate.data) {
        if (Array.isArray(apiResponseTemplate.data.products)) {
          firstPageProducts = apiResponseTemplate.data.products;
          totalPages = apiResponseTemplate.data.pages || 1;
        } else if (Array.isArray(apiResponseTemplate.data)) {
          firstPageProducts = apiResponseTemplate.data;
        }
      } else if (apiResponseTemplate && Array.isArray(apiResponseTemplate.products)) {
        firstPageProducts = apiResponseTemplate.products;
      } else if (Array.isArray(apiResponseTemplate)) {
        firstPageProducts = apiResponseTemplate;
      }
      
      allProducts = [...firstPageProducts];

      for (page = 2; page <= totalPages; page++) {
        try {
          const pageUrl = `https://rolemall.com/api/products/?token=${token}&limit=${limit}&page=${page}`;
          const pageRes = await fetch(pageUrl);
          if (pageRes.ok) {
            const pageData = await pageRes.json();
            let pageProducts: any[] = [];
            if (pageData && pageData.data) {
              if (Array.isArray(pageData.data.products)) {
                pageProducts = pageData.data.products;
              } else if (Array.isArray(pageData.data)) {
                pageProducts = pageData.data;
              }
            } else if (pageData && Array.isArray(pageData.products)) {
              pageProducts = pageData.products;
            } else if (Array.isArray(pageData)) {
              pageProducts = pageData;
            }
            allProducts = [...allProducts, ...pageProducts];
          }
        } catch (pageErr) {
          console.error(`❌ [Seeding] Error page ${page}:`, pageErr);
        }
      }

      let finalData: any = {};
      if (apiResponseTemplate && apiResponseTemplate.data && Array.isArray(apiResponseTemplate.data.products)) {
        finalData = {
          ...apiResponseTemplate,
          data: {
            ...apiResponseTemplate.data,
            page: 1,
            limit: allProducts.length,
            total: allProducts.length,
            pages: 1,
            products: allProducts
          }
        };
      } else if (apiResponseTemplate && apiResponseTemplate.data && Array.isArray(apiResponseTemplate.data)) {
        finalData = {
          ...apiResponseTemplate,
          data: allProducts
        };
      } else if (apiResponseTemplate && Array.isArray(apiResponseTemplate.products)) {
        finalData = {
          ...apiResponseTemplate,
          products: allProducts
        };
      } else {
        finalData = allProducts;
      }

      fs.writeFileSync(PRODUCTS_STATIC_PATH, JSON.stringify(finalData, null, 2), "utf8");
      console.log(`✅ [Seeding] Successfully updated products_static_fallback.json with ${allProducts.length} products`);
    }
  } catch (err) {
    console.error("❌ [Seeding] Failed to seed products:", err);
  }

  loadBackupsFromDisk();
}

// Helpers for caching and backups
function saveCategoriesBackup(data: any) {
  try {
    inMemoryCategories = data;
    fs.writeFileSync(CATEGORIES_BACKUP_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving categories backup:", err);
  }
}

function saveProductsBackup(key: string, data: any) {
  try {
    inMemoryProducts[key] = data;
    fs.writeFileSync(PRODUCTS_BACKUP_PATH, JSON.stringify(inMemoryProducts, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving products backup:", err);
  }
}

// Function to hash user data as per Facebook CAPI requirements
function hashData(data: string | undefined): string | undefined {
  if (!data || data.trim() === "") return undefined;
  const cleanData = data.trim().toLowerCase();
  return crypto.createHash("sha256").update(cleanData).digest("hex");
}

function parseCookies(cookieHeader: string | undefined) {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(`;`).forEach(function(cookie) {
    let [name, ...rest] = cookie.split(`=`);
    name = name?.trim();
    if (!name) return;
    const value = rest.join(`=`).trim();
    if (!value) return;
    list[name] = decodeURIComponent(value);
  });
  return list;
}

// Helper to send Conversions API (CAPI) events
async function sendCAPIEvent(eventName: string, eventData: any, reqHeaders: Record<string, string | undefined>, clientIp: string, eventId?: string) {
  const pixelId = process.env.VITE_META_PIXEL_ID || process.env.META_PIXEL_ID || "825112190493890";
  const accessToken = process.env.VITE_META_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
  
  if (!pixelId || !accessToken) {
    console.log(`[CAPI] Skipped ${eventName} - Missing credentials`);
    return;
  }

  const url = `https://graph.facebook.com/v19.0/${pixelId}/events`;
  const cookies = parseCookies(reqHeaders.cookie || reqHeaders.Cookie);
  
  const rawValue = eventData.value || eventData.all_price || 0;
  const parsedValue = parseFloat(String(rawValue).replace(/[^0-9.]/g, ""));
  const valueNum = isNaN(parsedValue) ? 0 : parsedValue;

  const rawIds = eventData.content_ids || (eventData.item_id ? [eventData.item_id] : []);
  const cleanContentIds = Array.isArray(rawIds) ? rawIds.map((id: any) => String(id)) : [String(rawIds)];
  
  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        user_data: {
          client_ip_address: clientIp,
          client_user_agent: reqHeaders["user-agent"],
          ph: hashData(eventData.phone || eventData.cus_num1),
          fn: hashData(eventData.firstName || eventData.cus_name),
          em: hashData(eventData.email),
          fbc: cookies._fbc,
          fbp: cookies._fbp,
        },
        custom_data: {
          currency: "IQD",
          value: valueNum,
          content_ids: cleanContentIds,
          content_type: "product"
        }
      }
    ]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, access_token: accessToken })
    });
    const result = await response.json();
    console.log(`[CAPI] ${eventName} response:`, result);
  } catch (error) {
    console.error(`[CAPI] Error sending ${eventName}:`, error);
  }
}

// Netlify Function Handler
export const handler: Handler = async (event, context) => {
  const pathPart = event.path;
  const httpMethod = event.httpMethod;

  const isTrack = pathPart.endsWith("/track");
  const isCheckout = pathPart.endsWith("/checkout");
  const isProducts = pathPart.endsWith("/products");
  const isCategories = pathPart.endsWith("/categories");
  const isValidatePromo = pathPart.endsWith("/validate-promo");

  // Standard API headers
  const resHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };

  // Handle OPTIONS preflight requests
  if (httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: resHeaders,
      body: JSON.stringify({ success: true })
    };
  }

  // Lazy trigger background seeding
  if (process.env.TRIGGER_SEED === "true") {
    seedStaticBackups().catch(err => console.error("Seeding error:", err));
  }

  const clientIp = event.headers["x-nf-client-connection-ip"] || event.headers["client-ip"] || "127.0.0.1";

  // 1. POST /api/track
  if (isTrack && httpMethod === "POST") {
    try {
      const body = event.body ? JSON.parse(event.body) : {};
      const { eventName, eventData, eventId } = body;
      await sendCAPIEvent(eventName, eventData, event.headers, clientIp, eventId);
      return {
        statusCode: 200,
        headers: resHeaders,
        body: JSON.stringify({ success: true })
      };
    } catch (error: any) {
      console.error("Tracking error:", error);
      return {
        statusCode: 500,
        headers: resHeaders,
        body: JSON.stringify({ error: "Failed to track event" })
      };
    }
  }

  // 2. GET /api/categories
  if (isCategories && httpMethod === "GET") {
    try {
      const response = await fetch("https://rolemall.com/api/categories/");
      if (!response.ok) throw new Error("Failed to fetch categories");
      const data = await response.json();
      
      saveCategoriesBackup(data);
      return {
        statusCode: 200,
        headers: resHeaders,
        body: JSON.stringify(data)
      };
    } catch (error) {
      console.error("Categories Fetch Error:", error);
      
      if (inMemoryCategories) {
        return {
          statusCode: 200,
          headers: resHeaders,
          body: JSON.stringify(inMemoryCategories)
        };
      }
      return {
        statusCode: 500,
        headers: resHeaders,
        body: JSON.stringify({ error: "Failed to fetch categories" })
      };
    }
  }

  // 3. GET /api/products
  if (isProducts && httpMethod === "GET") {
    const query = event.queryStringParameters || {};
    const category = query.category;
    const limit = query.limit || "100";
    const categoryKey = (category && category !== "جميع المنتجات") ? (category as string) : "all";

    try {
      const token = process.env.SUPPLIER_API_TOKEN || process.env.VITE_TOKEN || "zXxpdGv";
      let url = `https://rolemall.com/api/products/?token=${token}&limit=${limit}`;
      if (category && category !== "جميع المنتجات") {
        url += `&category=${encodeURIComponent(category as string)}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      
      saveProductsBackup(categoryKey, data);
      return {
        statusCode: 200,
        headers: resHeaders,
        body: JSON.stringify(data)
      };
    } catch (error) {
      console.error(`Products Fetch Error for category "${categoryKey}":`, error);
      
      // Serve from specific category cache
      if (inMemoryProducts && inMemoryProducts[categoryKey]) {
        return {
          statusCode: 200,
          headers: resHeaders,
          body: JSON.stringify(inMemoryProducts[categoryKey])
        };
      }
      
      // Serve from general "all" cache and filter
      if (inMemoryProducts && inMemoryProducts["all"]) {
        const allProducts = inMemoryProducts["all"];
        let filtered = allProducts;
        
        if (Array.isArray(allProducts)) {
          filtered = allProducts.filter((p: any) => {
            if (!category) return true;
            const pCat = String(p.category || p.category_name || p.category_id || "").toLowerCase();
            const targetCat = String(category).toLowerCase();
            return pCat.includes(targetCat) || targetCat.includes(pCat);
          });
          if (filtered.length === 0) filtered = allProducts;
        } else if (allProducts && Array.isArray(allProducts.data)) {
          const items = allProducts.data.filter((p: any) => {
            if (!category) return true;
            const pCat = String(p.category || p.category_name || p.category_id || "").toLowerCase();
            const targetCat = String(category).toLowerCase();
            return pCat.includes(targetCat) || targetCat.includes(pCat);
          });
          filtered = { ...allProducts, data: items.length > 0 ? items : allProducts.data };
        } else if (allProducts && allProducts.products && Array.isArray(allProducts.products)) {
          const items = allProducts.products.filter((p: any) => {
            if (!category) return true;
            const pCat = String(p.category || p.category_name || p.category_id || "").toLowerCase();
            const targetCat = String(category).toLowerCase();
            return pCat.includes(targetCat) || targetCat.includes(pCat);
          });
          filtered = { ...allProducts, products: items.length > 0 ? items : allProducts.products };
        }
        
        return {
          statusCode: 200,
          headers: resHeaders,
          body: JSON.stringify(filtered)
        };
      }
      
      return {
        statusCode: 500,
        headers: resHeaders,
        body: JSON.stringify({ error: "Failed to fetch products" })
      };
    }
  }

  // 4. POST /api/validate-promo
  if (isValidatePromo && httpMethod === "POST") {
    try {
      const body = event.body ? JSON.parse(event.body) : {};
      const { code } = body;
      if (!code) {
        return {
          statusCode: 400,
          headers: resHeaders,
          body: JSON.stringify({ error: "Code is required" })
        };
      }

      const validPromoCodes: Record<string, { discountPercent?: number, discountFixed?: number }> = {
        "VIP10": { discountPercent: 10 },
        "WELCOME5000": { discountFixed: 5000 },
        "SALE20": { discountPercent: 20 },
      };

      const promo = validPromoCodes[code.toUpperCase()];
      if (promo) {
        return {
          statusCode: 200,
          headers: resHeaders,
          body: JSON.stringify({ valid: true, ...promo })
        };
      } else {
        return {
          statusCode: 400,
          headers: resHeaders,
          body: JSON.stringify({ valid: false, error: "كود الخصم غير صحيح أو منتهي الصلاحية" })
        };
      }
    } catch (error) {
      console.error("Promo code error:", error);
      return {
        statusCode: 500,
        headers: resHeaders,
        body: JSON.stringify({ error: "Internal Server Error" })
      };
    }
  }

  // 5. POST /api/checkout
  if (isCheckout && httpMethod === "POST") {
    try {
      const orderData = event.body ? JSON.parse(event.body) : {};
      
      const responseData = { 
        success: true, 
        data: { 
          order_id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          message: "Order processed locally" 
        } 
      };

      // Background Purchase Event Tracking
      sendCAPIEvent("Purchase", orderData, event.headers, clientIp).catch(e => console.error("Checkout CAPI tracking error:", e));

      // 1. Google Sheets Integration Webhook
      const sheetWebhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbw7HnvfUsq85RdA3lFkmKM6whdhObeuCAf5gVlEoo4KEaeDN7cYAgge-5Z1W3zPjnmDUg/exec";
      if (sheetWebhookUrl) {
        let displayProductName = `المنتج #${orderData.item_id}`;
        if (orderData.note) {
          const cleaned = orderData.note.split('(الكمية')[0].replace(/.*الطلب الفعلي: /, '').trim();
          if (cleaned) {
            displayProductName = cleaned;
          }
        }

        fetch(sheetWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName: displayProductName,
            name: orderData.cus_name,
            phone: orderData.cus_num1,
            governorate: orderData.capetel,
            address: orderData.address,
            productId: orderData.item_id,
            quantity: orderData.count,
            totalPrice: orderData.all_price,
            notes: orderData.note || "",
            date: new Date().toLocaleString('ar-IQ')
          })
        }).catch(err => console.error("Error sending to sheet webhook:", err));
      }

      // 2. Telegram Bot Integration
      const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || "7511209345:AAGoGxgr7GYMIc1lgQr8JoAWgeXevQAHor8";
      const telegramChatId = process.env.TELEGRAM_CHAT_ID || "252464127";
      if (telegramBotToken && telegramChatId) {
        let displayProductName = `المنتج #${orderData.item_id}`;
        if (orderData.note) {
          const cleaned = orderData.note.split('(الكمية')[0].replace(/.*الطلب الفعلي: /, '').trim();
          if (cleaned) {
            displayProductName = cleaned;
          }
        }
        
        const telegramMessage = `📦 طلب جديد\n\nالمنتج: ${displayProductName}\n\nالاسم: ${orderData.cus_name}\n\nالهاتف: ${orderData.cus_num1}\n\nالمحافظة: ${orderData.capetel}\n\nالعنوان: ${orderData.address}\n\nالعدد: ${orderData.count}\n\nالمبلغ الإجمالي: ${orderData.all_price.toLocaleString()} د.ع`;
        
        fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: telegramMessage
          })
        }).catch(tgErr => console.error("Error sending Telegram message:", tgErr));
      }

      return {
        statusCode: 200,
        headers: resHeaders,
        body: JSON.stringify({ success: true, data: responseData })
      };
    } catch (error) {
      console.error("Checkout Error:", error);
      return {
        statusCode: 500,
        headers: resHeaders,
        body: JSON.stringify({ error: "Internal Server Error" })
      };
    }
  }

  // Fallback 404
  return {
    statusCode: 404,
    headers: resHeaders,
    body: JSON.stringify({ error: `API route not found: ${httpMethod} ${pathPart}` })
  };
};
