const db = require('../config/db');

// 🔹 Отримати всі записи
const getAllAppointments = async () => {
  const [rows] = await db.query('SELECT * FROM appointments');
  return rows;
};

// 🔹 Отримати записи користувача
const getAppointmentsByUser = async (userId) => {
  const [rows] = await db.query(
    'SELECT * FROM appointments WHERE user_id = ? ORDER BY appointment_datetime',
    [userId]
  );
  return rows;
};

// 🔹 Видалити запис
const deleteAppointment = async (id) => {
  const [result] = await db.query(
    'DELETE FROM appointments WHERE id = ?',
    [id]
  );
  return result.affectedRows;
};

//////////////////////////////////////////////////////
// 🔵 НОВЕ: створення запису
//////////////////////////////////////////////////////
const createAppointment = async (data) => {
  const {
    datetime,
    serviceId,
    userId,
    masterId,
    paymentMethod
  } = data;

  // 1. вставка запису
  const [result] = await db.query(
    `INSERT INTO appointments 
    (appointment_datetime, service_id, user_id, master_id, payment_method)
    VALUES (?, ?, ?, ?, ?)`,
    [datetime, serviceId, userId, masterId, paymentMethod]
  );

  const appointmentId = result.insertId;

  // 2. генеруємо orderId (під оплату)
  const orderId = `app_${appointmentId}_${Date.now()}`;

  // 3. зберігаємо orderId
  await db.query(
    'UPDATE appointments SET liqpay_order_id = ? WHERE id = ?',
    [orderId, appointmentId]
  );

  // 4. повертаємо результат
  return {
    appointmentId,
    paymentMethod,
    orderId
  };
};

module.exports = {
  getAllAppointments,
  getAppointmentsByUser,
  deleteAppointment,
  createAppointment
};