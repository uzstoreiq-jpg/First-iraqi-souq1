const fetch = require('node-fetch');

async function run() {
  try {
    const res = await fetch('https://rolemall.com/api/products?page=1&limit=10');
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
  } catch (e) {
    console.error(e);
  }
}

run();
