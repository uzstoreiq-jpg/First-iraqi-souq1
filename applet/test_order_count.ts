async function run() {
  try {
    const orderPayload = {
      cus_name: "Test User",
      cus_num1: "07700000020",
      capetel: "بغداد",
      city: "المنصور",
      address: "شارع 14 رمضان",
      item_id: "12612",
      all_price: 50000,
      count: 1,
      note: "Test order",
      ip: ""
    };

    const res = await fetch('https://rolemall.com/api/add-simple-order?token=zXxpdGv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': `192.168.4.${Math.floor(Math.random() * 255)}`
      },
      body: JSON.stringify(orderPayload),
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
  } catch (e) {
    console.error(e);
  }
}

run();
