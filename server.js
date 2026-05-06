const express = require('express');
const app = express();
app.use(express.json());

// Підключаємо маршрути
const servicesRoutes = require('./routes/services');
app.use('/services', servicesRoutes);

const appointmentsRoutes = require('./routes/appointments');
app.use('/appointments', appointmentsRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});