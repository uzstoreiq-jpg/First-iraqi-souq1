fetch("https://script.google.com/macros/s/AKfycbw7HnvfUsq85RdA3lFkmKM6whdhObeuCAf5gVlEoo4KEaeDN7cYAgge-5Z1W3zPjnmDUg/exec", {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productName: "فشار طازج وصحي",
    name: "Test User",
    phone: "0770000000",
    governorate: "بغداد",
    address: "حي الجامعة",
    productId: 123,
    quantity: 1,
    totalPrice: 15000,
    notes: "test",
    date: "2024-05-07"
  })
}).then(res => {
  console.log("Status:", res.status);
  return res.text();
}).then(t => console.log("Response:", t)).catch(e => console.error("Error:", e));
