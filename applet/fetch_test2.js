async function run() {
  try {
    const res = await fetch('https://rolemall.com/api/product-details?strung=gootquality&product_id=19');
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
  } catch (e) {
    console.error(e);
  }
}

run();
