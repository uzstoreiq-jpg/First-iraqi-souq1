// Meta Pixel tracking utility

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

let isPixelInitialized = false;

// Helper to retrieve tracked event keys from sessionStorage
const getTrackedEvents = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const tracked = sessionStorage.getItem('fb_tracked_events');
    return tracked ? JSON.parse(tracked) : [];
  } catch (error) {
    return [];
  }
};

// Helper to mark an event key as tracked in sessionStorage
const markEventAsTracked = (eventKey: string) => {
  if (typeof window === 'undefined') return;
  try {
    const tracked = getTrackedEvents();
    if (!tracked.includes(eventKey)) {
      tracked.push(eventKey);
      sessionStorage.setItem('fb_tracked_events', JSON.stringify(tracked));
    }
  } catch (error) {}
};

export const generateEventId = () => {
  return 'evt_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

export const initMetaPixel = () => {
  if (typeof window === 'undefined') return;
  if (isPixelInitialized) return;
  isPixelInitialized = true;
  
  const inIframe = () => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };

  if (inIframe()) {
    console.log("[Meta Pixel] Running inside an iframe/preview sandbox. Initializing safe mock tracker to prevent cross-origin Script errors.");
    window.fbq = function(...args: any[]) {
      console.log("[Mock Meta Pixel Call]", ...args);
    };
    window.fbq.queue = [];
    window._fbq = window.fbq;
    return;
  }

  (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)})(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
  const pixelId = import.meta.env.VITE_META_PIXEL_ID || '825112190493890';
  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
};

const sendServerEvent = async (eventName: string, data: any, eventId: string, userData: any = {}) => {
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        eventName,
        eventData: { ...data, ...userData },
        eventId
      })
    });
  } catch (error) {
    console.error('[CAPI] Failed to send event to server', error);
  }
};

export const trackEvent = (eventName: string, data: any = {}, userData: any = {}, eventId?: string) => {
  if (typeof window !== 'undefined' && window.fbq) {
    const id = eventId || generateEventId();
    
    // Specifically deduplicate Purchases based on order_id to be extra safe
    const isPurchase = eventName.toLowerCase() === 'purchase';
    const dedupKey = (isPurchase && data.order_id) ? `purchase_${data.order_id}` : id;
    
    // Check if duplicate
    const trackedEvents = getTrackedEvents();
    if (trackedEvents.includes(dedupKey) || (isPurchase && trackedEvents.some(key => key.includes(`purchase_${data.order_id}`)))) {
      console.log(`[Meta Pixel] Skipped duplicate event: ${eventName} (Key: ${dedupKey})`);
      return id;
    }
    
    markEventAsTracked(dedupKey);
    if (isPurchase && id) {
      markEventAsTracked(id);
    }

    // Clean data values to prevent "currency invalid" errors where value isn't a proper float
    const cleanedData = { ...data };
    if (cleanedData.value !== undefined) {
      const rawVal = String(cleanedData.value).replace(/[^0-9.]/g, '');
      const parsedVal = parseFloat(rawVal);
      cleanedData.value = isNaN(parsedVal) ? 0 : parsedVal;
    }
    if (cleanedData.content_ids) {
      cleanedData.content_ids = cleanedData.content_ids.map((cid: any) => String(cid));
    }

    window.fbq('track', eventName, cleanedData, { eventID: id });
    console.log(`[Meta Pixel] Tracked ${eventName} (ID: ${id})`, cleanedData);
    
    // Send to CAPI
    sendServerEvent(eventName, cleanedData, id, userData);
    
    return id;
  }
  return undefined;
};

export const trackPageView = (userData: any = {}, eventId?: string) => {
  return trackEvent('PageView', {}, userData, eventId);
};

export const trackViewContent = (product: any) => {
  const rawPrice = String(product.price).replace(/[^0-9.]/g, '');
  const priceNum = parseFloat(rawPrice) || 0;
  return trackEvent('ViewContent', {
    content_ids: [String(product.id)],
    content_name: product.name,
    content_type: 'product',
    value: priceNum,
    currency: 'IQD',
  });
};

export const trackAddToCart = (product: any, quantity: number = 1) => {
  const rawPrice = String(product.price).replace(/[^0-9.]/g, '');
  const priceNum = parseFloat(rawPrice) || 0;
  return trackEvent('AddToCart', {
    content_ids: [String(product.id)],
    content_name: product.name,
    content_type: 'product',
    value: priceNum * quantity,
    currency: 'IQD',
  });
};

export const trackInitiateCheckout = (cartItems: any[], totalValue: number) => {
  const rawTotal = String(totalValue).replace(/[^0-9.]/g, '');
  const totalNum = parseFloat(rawTotal) || 0;
  return trackEvent('InitiateCheckout', {
    content_ids: cartItems.map((item: any) => String(item.product ? item.product.id : item.id)),
    content_type: 'product',
    value: totalNum,
    currency: 'IQD',
    num_items: cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0),
  });
};

export const trackPurchase = (orderId: string, cartItems: any[], totalValue: number, userData: any = {}, eventId?: string) => {
  const rawTotal = String(totalValue).replace(/[^0-9.]/g, '');
  const totalNum = parseFloat(rawTotal) || 0;
  return trackEvent('Purchase', {
    content_ids: cartItems.map((item: any) => String(item.product ? item.product.id : item.id)),
    content_type: 'product',
    value: totalNum,
    currency: 'IQD',
    order_id: orderId,
  }, userData, eventId);
};
