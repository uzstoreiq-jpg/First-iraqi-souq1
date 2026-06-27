async function test() {
  const url = 'https://rolemall.com/api/add-simple-order?token=zXxpdGv';
  const payload = {
    cus_name: "Test User",
    cus_num1: "07700000000",
    capetel: "بغداد",
    city: "الكرادة",
    address: "شارع 62",
    item_id: [12395, 12527],
    all_price: 35000,
    count: [2, 1],
    note: "Test"
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log(res.status, await res.text());
}
test();
