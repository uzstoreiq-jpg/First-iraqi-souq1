import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";
import fs from "fs";

dotenv.config();

// Paths for persistent local backup files (Dynamic Cache)
const CATEGORIES_BACKUP_PATH = path.join(process.cwd(), "categories_backup.json");
const PRODUCTS_BACKUP_PATH = path.join(process.cwd(), "products_backup.json");

// Paths for pre-bundled static backup files (Static Fallback)
const CATEGORIES_STATIC_PATH = path.join(process.cwd(), "categories_static_fallback.json");
const PRODUCTS_STATIC_PATH = path.join(process.cwd(), "products_static_fallback.json");

// In-memory cache fallback to avoid excessive disk reads
let inMemoryCategories: any = null;
let inMemoryProducts: Record<string, any> = {};

// Helper to load backups from disk on startup
function loadBackupsFromDisk() {
  // 1. Try loading Categories (Dynamic Cache first, then Static Fallback)
  try {
    if (fs.existsSync(CATEGORIES_BACKUP_PATH)) {
      const data = fs.readFileSync(CATEGORIES_BACKUP_PATH, "utf8");
      inMemoryCategories = JSON.parse(data);
      console.log("🟢 [Data Source: Dynamic Cache] Loaded categories runtime backup successfully.");
    } else if (fs.existsSync(CATEGORIES_STATIC_PATH)) {
      const data = fs.readFileSync(CATEGORIES_STATIC_PATH, "utf8");
      inMemoryCategories = JSON.parse(data);
      console.log("🔵 [Data Source: Static Fallback] Loaded categories static fallback (Deploy asset).");
    } else {
      console.warn("⚠️ [Data Source: None] No category backup or static fallback files found!");
    }
  } catch (err) {
    console.error("❌ [Backup] Error loading categories backup:", err);
  }

  // 2. Try loading Products (Dynamic Cache first, then Static Fallback)
  try {
    if (fs.existsSync(PRODUCTS_BACKUP_PATH)) {
      const data = fs.readFileSync(PRODUCTS_BACKUP_PATH, "utf8");
      inMemoryProducts = JSON.parse(data);
      console.log("🟢 [Data Source: Dynamic Cache] Loaded products runtime backup successfully.");
    } else if (fs.existsSync(PRODUCTS_STATIC_PATH)) {
      const data = fs.readFileSync(PRODUCTS_STATIC_PATH, "utf8");
      const staticData = JSON.parse(data);
      // Map the static fallback to the "all" category key
      inMemoryProducts = { all: staticData };
      console.log("🔵 [Data Source: Static Fallback] Loaded products static fallback (Deploy asset).");
    } else {
      console.warn("⚠️ [Data Source: None] No product backup or static fallback files found!");
    }
  } catch (err) {
    console.error("❌ [Backup] Error loading products backup:", err);
  }
}

// Call loadBackupsFromDisk on initialization
loadBackupsFromDisk();

// Dynamic Seeding: Fetch fresh real categories and products from affiliate API to seed static backup files
async function seedStaticBackups() {
  const token = process.env.SUPPLIER_API_TOKEN || process.env.VITE_TOKEN || "zXxpdGv";
  console.log("🔄 [Seeding] Fetching fresh real categories and products from affiliate API to seed static backup files...");
  
  try {
    const catRes = await fetch("https://rolemall.com/api/categories/");
    if (catRes.ok) {
      const catData = await catRes.json();
      fs.writeFileSync(CATEGORIES_STATIC_PATH, JSON.stringify(catData, null, 2), "utf8");
      console.log("✅ [Seeding] Successfully updated categories_static_fallback.json with real affiliate data!");
    } else {
      console.warn(`⚠️ [Seeding] Categories API returned status ${catRes.status} during seeding.`);
    }
  } catch (err) {
    console.error("❌ [Seeding] Failed to seed categories static fallback from API:", err);
  }

  try {
    let allProducts: any[] = [];
    let page = 1;
    let totalPages = 1;
    let limit = 100;
    let apiResponseTemplate: any = null;

    // Fetch page 1 first to identify structure and total pages/items
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
      console.log(`📥 [Seeding] Fetched Page 1/${totalPages}: Found ${firstPageProducts.length} products.`);

      // Sequentially fetch all remaining pages of products
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
            console.log(`📥 [Seeding] Fetched Page ${page}/${totalPages}: Found ${pageProducts.length} products.`);
          } else {
            console.warn(`⚠️ [Seeding] Failed to fetch page ${page} during seeding.`);
          }
        } catch (pageErr) {
          console.error(`❌ [Seeding] Error fetching page ${page}:`, pageErr);
        }
      }

      // Reconstruct final payload matching original structure with merged list
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
      console.log(`✅ [Seeding] Successfully updated products_static_fallback.json with ALL ${allProducts.length} real products (merged from ${totalPages} pages)!`);
    } else {
      console.warn(`⚠️ [Seeding] Products API returned status ${prodRes.status} during seeding.`);
    }
  } catch (err) {
    console.error("❌ [Seeding] Failed to seed products static fallback from API:", err);
  }

  // Reload the backups from disk to update the memory cache
  loadBackupsFromDisk();
}

// Seed the static backups asynchronously on server startup to ensure 100% real live data is used as the baseline
seedStaticBackups().catch(err => console.error("❌ [Seeding] Error in seedStaticBackups:", err));

// Helper to save categories backup
function saveCategoriesBackup(data: any) {
  try {
    inMemoryCategories = data;
    fs.writeFileSync(CATEGORIES_BACKUP_PATH, JSON.stringify(data, null, 2), "utf8");
    console.log("[Backup] Successfully saved categories backup to disk.");
  } catch (err) {
    console.error("[Backup] Error saving categories backup to disk:", err);
  }
}

// Helper to save products backup for a specific category key (e.g. "all" or specific category)
function saveProductsBackup(key: string, data: any) {
  try {
    inMemoryProducts[key] = data;
    fs.writeFileSync(PRODUCTS_BACKUP_PATH, JSON.stringify(inMemoryProducts, null, 2), "utf8");
    console.log(`[Backup] Successfully saved products backup for key "${key}" to disk.`);
  } catch (err) {
    console.error("[Backup] Error saving products backup to disk:", err);
  }
}

// Function to hash user data as per Facebook CAPI requirements (SHA-256, hex, lowercase)
function hashData(data: string | undefined): string | undefined {
  if (!data || data.trim() === "") return undefined;
  const cleanData = data.trim().toLowerCase();
  return crypto.createHash("sha256").update(cleanData).digest("hex");
}

// Helper function to extract cookies manually
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

// Helper function to send Conversions API (CAPI) events
async function sendCAPIEvent(eventName: string, eventData: any, req: express.Request, eventId?: string) {
  const pixelId = process.env.VITE_META_PIXEL_ID || process.env.META_PIXEL_ID || "825112190493890";
  const accessToken = process.env.VITE_META_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
  
  if (!pixelId || !accessToken) {
    console.log(`[CAPI] Skipped ${eventName} - Missing credentials`);
    return;
  }

  const url = `https://graph.facebook.com/v19.0/${pixelId}/events`;
  const cookies = parseCookies(req.headers.cookie);
  
  // Clean decimal numbers to avoid "currency invalid" CAPI validation failures
  const rawValue = eventData.value || eventData.all_price || 0;
  const parsedValue = parseFloat(String(rawValue).replace(/[^0-9.]/g, ""));
  const valueNum = isNaN(parsedValue) ? 0 : parsedValue;

  // content_ids must always be a CAPI-approved array of strings
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
          client_ip_address: req.ip,
          client_user_agent: req.headers["user-agent"],
          ph: hashData(eventData.phone || eventData.cus_num1),
          fn: hashData(eventData.firstName || eventData.cus_name),
          em: hashData(eventData.email), // if available
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Route for generic CAPI tracking
  app.post("/api/track", async (req, res) => {
    try {
      const { eventName, eventData, eventId } = req.body;
      await sendCAPIEvent(eventName, eventData, req, eventId);
      res.json({ success: true });
    } catch (error) {
      console.error("Tracking Error:", error);
      res.status(500).json({ error: "Failed to track event" });
    }
  });

  // API Route to get categories

  app.get("/api/categories", async (req, res) => {
    try {
      const response = await fetch("https://rolemall.com/api/categories/");
      if (!response.ok) throw new Error("Failed to fetch categories");
      const data = await response.json();
      
      // Update persistent backup automatically when successful
      saveCategoriesBackup(data);
      console.log("🌐 [Direct API Success] Served categories directly from live rolemall API.");
      
      res.json(data);
    } catch (error) {
      console.error("Categories Fetch Error:", error);
      
      // Serve last successful categories backup from disk/memory if API fails
      if (inMemoryCategories) {
        const isDynamic = fs.existsSync(CATEGORIES_BACKUP_PATH);
        console.log(
          isDynamic
            ? "⚠️ [API Offline -> Dynamic Cache] Served categories fallback from warm runtime backup (categories_backup.json)."
            : "⚠️ [API Offline -> Static Fallback] Served categories fallback from persistent static deploy file (categories_static_fallback.json)."
        );
        return res.json(inMemoryCategories);
      }
      
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // API Route to get products
  app.get("/api/products", async (req, res) => {
    const { category, limit = 100 } = req.query;
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
      
      // Update persistent backup automatically when successful
      saveProductsBackup(categoryKey, data);
      console.log(`🌐 [Direct API Success] Served products directly from live rolemall API (Category: "${categoryKey}").`);
      
      res.json(data);
    } catch (error) {
      console.error(`Products Fetch Error for category "${categoryKey}":`, error);
      
      // 1. Serve last successful specific category backup if available
      if (inMemoryProducts && inMemoryProducts[categoryKey]) {
        const isDynamic = fs.existsSync(PRODUCTS_BACKUP_PATH);
        console.log(
          isDynamic
            ? `⚠️ [API Offline -> Dynamic Cache] Served products for category "${categoryKey}" from warm runtime backup.`
            : `⚠️ [API Offline -> Static Fallback] Served products for category "${categoryKey}" from persistent static deploy file.`
        );
        return res.json(inMemoryProducts[categoryKey]);
      }
      
      // 2. Serve from general "all" products backup and filter if specific category wasn't cached yet
      if (inMemoryProducts && inMemoryProducts["all"]) {
        const isDynamic = fs.existsSync(PRODUCTS_BACKUP_PATH);
        console.log(
          isDynamic
            ? `⚠️ [API Offline -> Dynamic Cache] Served filtered 'all' products for category "${categoryKey}" from warm runtime backup.`
            : `⚠️ [API Offline -> Static Fallback] Served filtered 'all' products for category "${categoryKey}" from persistent static deploy file.`
        );
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
        
        return res.json(filtered);
      }
      
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // API Route to validate promo codes
  app.post("/api/validate-promo", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: "Code is required" });

      // هنا يمكنك إضافة أكواد الخصم وتغيير نسب الخصم
      // discountPercent: تحديد نسبة مئوية للخصم (مثال 10 يعني خصم 10%)
      // discountFixed: تحديد مبلغ ثابت للخصم (مثال 5000 يعني خصم 5000 دينار)
      const validPromoCodes: Record<string, { discountPercent?: number, discountFixed?: number }> = {
        "VIP10": { discountPercent: 10 },
        "WELCOME5000": { discountFixed: 5000 },
        "SALE20": { discountPercent: 20 },
      };

      const promo = validPromoCodes[code.toUpperCase()];
      if (promo) {
        res.json({ valid: true, ...promo });
      } else {
        res.status(400).json({ valid: false, error: "كود الخصم غير صحيح أو منتهي الصلاحية" }); // Invalid or expired
      }
    } catch (error) {
      console.error("Promo code error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // API Route to handle checkout
  app.post("/api/checkout", async (req, res) => {
    try {
      const orderData = req.body;
      
      // Supplier API URL
      const supplierUrl = "https://rolemall.com/api/add-simple-order";
      const token = process.env.SUPPLIER_API_TOKEN || process.env.VITE_TOKEN || "zXxpdGv";

      // Clean up orderData to only include required/allowed fields
      const cleanOrderData = {
        cus_name: orderData.cus_name,
        cus_num1: orderData.cus_num1,
        capetel: orderData.capetel,
        city: orderData.city || "",
        address: orderData.address,
        item_id: orderData.item_id,
        all_price: orderData.all_price,
        count: orderData.count,
        note: orderData.note || "",
        ip: ""
      };

      // Forward request to supplier - BYPASSED: Order is processed locally and not sent to affiliate
      const responseData = { 
        success: true, 
        data: { 
          order_id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          message: "Order processed locally" 
        } 
      };

      // Here we trigger CAPI (Conversions API) for Purchase event
      // This runs asynchronously so it doesn't block the response to the client
      sendCAPIEvent("Purchase", orderData, req);

      // Google Sheets Integration via Webhook (Google Apps Script / Zapier / Make)
      const sheetWebhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbw7HnvfUsq85RdA3lFkmKM6whdhObeuCAf5gVlEoo4KEaeDN7cYAgge-5Z1W3zPjnmDUg/exec";
      
      if (sheetWebhookUrl) {
        // Run explicitly in background
        setTimeout(async () => {
          try {
            console.log("Sending order to Google Sheet Webhook...");
            
            // Extract product name from notes if possible
            let displayProductName = `المنتج #${orderData.item_id}`;
            if (orderData.note) {
              const cleaned = orderData.note.split('(الكمية')[0].replace(/.*الطلب الفعلي: /, '').trim();
              if (cleaned) {
                displayProductName = cleaned;
              }
            }

            const response = await fetch(sheetWebhookUrl, {
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
            });
            const textResponse = await response.text();
            console.log("Sheet Webhook Response Status:", response.status);
            console.log("Sheet Webhook Response:", textResponse);
          } catch (sheetErr) {
            console.error("Error in webhook logic:", sheetErr);
          }
        }, 0);
      }

      // Telegram Bot Integration in the background
      const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || "7511209345:AAGoGxgr7GYMIc1lgQr8JoAWgeXevQAHor8";
      const telegramChatId = process.env.TELEGRAM_CHAT_ID || "252464127";
      if (telegramBotToken && telegramChatId) {
        setTimeout(async () => {
          try {
            // Extract product name from notes if possible
            let displayProductName = `المنتج #${orderData.item_id}`;
            if (orderData.note) {
              const cleaned = orderData.note.split('(الكمية')[0].replace(/.*الطلب الفعلي: /, '').trim();
              if (cleaned) {
                displayProductName = cleaned;
              }
            }
            
            const telegramMessage = `📦 طلب جديد\n\nالمنتج: ${displayProductName}\n\nالاسم: ${orderData.cus_name}\n\nالهاتف: ${orderData.cus_num1}\n\nالمحافظة: ${orderData.capetel}\n\nالعنوان: ${orderData.address}\n\nالعدد: ${orderData.count}\n\nالمبلغ الإجمالي: ${orderData.all_price.toLocaleString()} د.ع`;
            
            await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: telegramChatId,
                text: telegramMessage
              })
            });
            console.log("Telegram notification sent successfully.");
          } catch (tgErr) {
            console.error("Error sending Telegram notification from server:", tgErr);
          }
        }, 0);
      }

      res.json({ success: true, data: responseData });
    } catch (error) {
      console.error("Checkout Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
