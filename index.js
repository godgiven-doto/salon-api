
require('dotenv').config(); 

const express = require('express');
const app = express();


app.use(express.json());


const serviceRoutes = require('./routes/services');
app.use('/api/services', serviceRoutes);

const appointmentsRoutes = require('./routes/appointments');
app.use('/appointments', appointmentsRoutes);

const authRoutes = require('./routes/auth');

app.use('/auth', authRoutes);

const adminRoutes = require('./routes/admin');

app.use('/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('API працює 🚀');
});

const path = require('path');
const fs = require('fs');

app.get('/success', (req, res) => {
  const filePath = path.join(__dirname, 'views/success.html');
  const html = fs.readFileSync(filePath, 'utf-8');
  res.send(html);
});

console.log('TEST PRIVATE KEY:', JSON.stringify(process.env.LIQPAY_PRIVATE_KEY));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущено на порту ${PORT}`);
});