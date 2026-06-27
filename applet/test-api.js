async function test() {
  const url = 'http://localhost:3000/api/checkout';
  const payload = {
    cus_name: "Test User",
    cus_num1: "07700000090",
    capetel: "بغداد",
    city: "الكرادة",
    address: "شارع 62",
    item_id: 12497,
    all_price: 30000,
    count: 1,
    note: "Test"
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    console.log(res.status, await res.text());
  } catch (e) {
    console.error(e);
  }
}
test();
