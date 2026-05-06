const crypto = require('crypto');

const createPayment = (params) => {
  const publicKey = process.env.LIQPAY_PUBLIC_KEY.trim();
  const privateKey = process.env.LIQPAY_PRIVATE_KEY.trim();

  const jsonObject = {
    public_key: publicKey,
    version: 7,
    action: "pay",
    amount: Number(params.amount), 
    currency: "UAH",
    description: String(params.description),
    order_id: String(params.order_id) 
  };

  const jsonString = JSON.stringify(jsonObject);
  
  // Явно вказуємо utf8 для стабільності
  const data = Buffer.from(jsonString, 'utf8').toString('base64');

  // У Node.js надійніше спочатку отримати бінарний Buffer, а потім Base64
  const signature = crypto
    .createHash('sha3-256')
    .update(privateKey + data + privateKey)
    .digest() // отримуємо Buffer
    .toString('base64'); // конвертуємо в base64

  return { data, signature };
};

module.exports = { createPayment };