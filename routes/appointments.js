const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { body, query, param, validationResult } = require('express-validator');
const appointmentController = require('../controllers/appointmentController');
const fs = require('fs');
const path = require('path');
const { createPayment } = require('../utils/liqpay');


// 🔹 Middleware для перевірки помилок валідації
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

//////////////////////////////////////////////////////
// 🔹 GET /appointments/slots
//////////////////////////////////////////////////////
router.get(
  '/slots',
  [
    query('date')
      .notEmpty().withMessage('Дата обовʼязкова')
      .isISO8601().withMessage('Некоректний формат дати'),

    query('masterId')
      .notEmpty().withMessage('masterId обовʼязковий')
      .isInt({ gt: 0 }).withMessage('masterId має бути числом > 0')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { date, masterId } = req.query;

      const allSlots = [];
      for (let h = 9; h <= 17; h++) {
        allSlots.push(`${date} ${h.toString().padStart(2, '0')}:00:00`);
      }

      const [booked] = await db.query(
        `SELECT DATE_FORMAT(appointment_datetime, '%Y-%m-%d %H:%i:%s') AS appointment_datetime
         FROM appointments
         WHERE master_id = ?
         AND appointment_datetime BETWEEN ? AND ?`,
        [masterId, `${date} 00:00:00`, `${date} 23:59:59`]
      );

      const bookedTimes = booked.map(b => b.appointment_datetime);
      const freeSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

      res.json({
        success: true,
        date,
        masterId: Number(masterId),
        freeSlots
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
  }
);

//////////////////////////////////////////////////////
// 🔹 POST /appointments
//////////////////////////////////////////////////////
router.post(
  '/',
  [
    body('datetime')
      .notEmpty().withMessage('Дата обовʼязкова')
      .isISO8601().withMessage('Некоректна дата')
      .custom(value => {
        const date = new Date(value);
        const now = new Date();

        if (date < now) {
          throw new Error('Дата не може бути в минулому');
        }

        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 6);

        if (date > maxDate) {
          throw new Error('Дата не може бути далі ніж через 6 місяців');
        }

        return true;
      }),

    body('serviceId')
      .notEmpty().withMessage('serviceId обовʼязковий')
      .isInt({ gt: 0 }).withMessage('serviceId має бути числом'),

    body('userId')
      .notEmpty().withMessage('userId обовʼязковий')
      .isInt({ gt: 0 }).withMessage('userId має бути числом'),

    body('masterId')
      .notEmpty().withMessage('masterId обовʼязковий')
      .isInt({ gt: 0 }).withMessage('masterId має бути числом'),

    body('paymentMethod')
      .notEmpty().withMessage('paymentMethod обовʼязковий')
      .isIn(['online', 'offline']).withMessage('Некоректний спосіб оплати')
  ],
  handleValidationErrors,
  async (req, res) => {
    const connection = await db.getConnection();

    try {
      const {
        datetime,
        serviceId,
        userId,
        masterId,
        paymentMethod
      } = req.body;

      await connection.beginTransaction();

      const [[service]] = await connection.query('SELECT id FROM services WHERE id = ?', [serviceId]);
      const [[user]] = await connection.query('SELECT id FROM users WHERE id = ?', [userId]);
      const [[master]] = await connection.query('SELECT id FROM masters WHERE id = ?', [masterId]);

      if (!service || !user || !master) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'Користувач, майстер або послуга не знайдені' });
      }

      const [existing] = await connection.query(
        'SELECT id FROM appointments WHERE master_id = ? AND appointment_datetime = ? FOR UPDATE',
        [masterId, datetime]
      );

      if (existing.length > 0) {
        await connection.rollback();
        return res.status(409).json({ success: false, message: 'Слот вже зайнятий' });
      }

      const [result] = await connection.query(
        `INSERT INTO appointments 
        (appointment_datetime, service_id, user_id, master_id, payment_method)
        VALUES (?, ?, ?, ?, ?)`,
        [datetime, serviceId, userId, masterId, paymentMethod]
      );

      let orderId = null;

      if (paymentMethod === 'online') {
        orderId = `${result.insertId}${Math.floor(Date.now() / 1000)}`;

        await connection.query(
          'UPDATE appointments SET liqpay_order_id = ? WHERE id = ?',
          [orderId, result.insertId]
        );
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Запис створено успішно',
        data: {
          appointmentId: result.insertId,
          paymentMethod,
          orderId
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('POST /appointments ERROR:', error);
      res.status(500).json({ success: false, message: 'Помилка сервера' });
    } finally {
      connection.release();
    }
  }
);

//////////////////////////////////////////////////////
// 🔹 GET /pay-page/:id
//////////////////////////////////////////////////////
router.get(
  '/pay-page/:id',
  [
    param('id')
      .isInt({ gt: 0 })
      .withMessage('ID має бути числом')
  ],
  handleValidationErrors,
  async (req, res) => {
    const { id } = req.params;

    try {
      const filePath = path.join(__dirname, '../views/payment.html');
      if (!fs.existsSync(filePath)) return res.status(500).send('payment.html не знайдено');

      let html = fs.readFileSync(filePath, 'utf-8');

      const [[appointment]] = await db.query('SELECT * FROM appointments WHERE id = ?', [id]);
      if (!appointment) return res.status(404).json({ success: false, message: 'Запис не знайдено' });

      const [[service]] = await db.query('SELECT price, name FROM services WHERE id = ?', [appointment.service_id]);
      if (!service || !service.price) return res.status(404).json({ success: false, message: 'Ціну не знайдено' });

      if (!appointment.liqpay_order_id) {
        return res.status(500).json({ success: false, message: 'Order ID відсутній' });
      }

      const params = {
        amount: service.price,
        description: service.name,
        order_id: appointment.liqpay_order_id,
        result_url: `${process.env.BASE_URL}/success`,
        server_url: `${process.env.BASE_URL}/appointments/callback`
      };

      const { data, signature } = createPayment(params);

      const finalHtml = html
        .split('{{data}}').join(data.trim())
        .split('{{signature}}').join(signature.trim());

      res.set('Content-Type', 'text/html; charset=utf-8');
      return res.send(finalHtml);

    } catch (error) {
      console.error('PAY PAGE ERROR:', error);
      return res.status(500).json({ success: false, message: 'Помилка сервера' });
    }
  }
);

//////////////////////////////////////////////////////
// 🔹 POST /callback
//////////////////////////////////////////////////////
router.post('/callback', async (req, res) => {
  try {
    if (!req.body || !req.body.data) {
      return res.status(400).send('Invalid request');
    }

    const decoded = JSON.parse(
      Buffer.from(req.body.data, 'base64').toString('utf-8')
    );

    if (decoded.status === 'success' || decoded.status === 'sandbox') {
      await db.query(
        'UPDATE appointments SET payment_status = "paid" WHERE liqpay_order_id = ?',
        [decoded.order_id]
      );
    }

    res.send('ok');
  } catch (error) {
    console.error('CALLBACK ERROR:', error);
    res.status(500).send('error');
  }
});

//////////////////////////////////////////////////////
// 🔹 Інші маршрути з валідацією
//////////////////////////////////////////////////////

router.get('/', appointmentController.getAllAppointments);

router.get(
  '/user/:userId',
  [
    param('userId')
      .isInt({ gt: 0 })
      .withMessage('userId має бути числом')
  ],
  handleValidationErrors,
  appointmentController.getUserAppointments
);

router.delete(
  '/:id',
  [
    param('id')
      .isInt({ gt: 0 })
      .withMessage('ID має бути числом')
  ],
  handleValidationErrors,
  appointmentController.deleteAppointment
);

module.exports = router;