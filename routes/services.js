const express = require('express');
const router = express.Router();
const db = require('../config/db');

const {
  body,
  param,
  validationResult
} = require('express-validator');


//////////////////////////////////////////////////////
// 🔹 Middleware для помилок валідації
//////////////////////////////////////////////////////
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
// 🔹 GET all services
//////////////////////////////////////////////////////
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM services');

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Помилка сервера'
    });
  }
});

//////////////////////////////////////////////////////
// 🔹 GET by id
//////////////////////////////////////////////////////
router.get(
  '/:id',
  [
    param('id')
      .isInt({ gt: 0 })
      .withMessage('ID має бути числом')
  ],
  handleValidationErrors,
  async (req, res) => {
    const { id } = req.params;

    try {
      const [rows] = await db.execute(
        'SELECT * FROM services WHERE id = ?',
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Послуга не знайдена'
        });
      }

      res.json({
        success: true,
        data: rows[0]
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Помилка сервера'
      });
    }
  }
);

//////////////////////////////////////////////////////
// 🔹 CREATE service
//////////////////////////////////////////////////////
router.post(
  '/',
  [
    body('name')
      .notEmpty().withMessage('Назва обовʼязкова')
      .isLength({ min: 2 }).withMessage('Назва занадто коротка'),

    body('price')
      .notEmpty().withMessage('Ціна обовʼязкова')
      .isFloat({ gt: 0 }).withMessage('Ціна має бути більше 0')
  ],
  handleValidationErrors,
  async (req, res) => {
    const { name, price } = req.body;

    try {
      const [result] = await db.execute(
        'INSERT INTO services (name, price) VALUES (?, ?)',
        [name, price]
      );

      res.status(201).json({
        success: true,
        data: {
          id: result.insertId,
          name,
          price
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Помилка сервера'
      });
    }
  }
);

//////////////////////////////////////////////////////
// 🔹 UPDATE service
//////////////////////////////////////////////////////
router.put(
  '/:id',
  [
    param('id')
      .isInt({ gt: 0 })
      .withMessage('ID має бути числом'),

    body('name')
      .optional()
      .notEmpty().withMessage('Назва не може бути пустою'),

    body('price')
      .optional()
      .isFloat({ gt: 0 }).withMessage('Ціна має бути більше 0')
  ],
  handleValidationErrors,
  async (req, res) => {
    const { id } = req.params;
    const { name, price } = req.body;

    try {
      const [result] = await db.execute(
        'UPDATE services SET name = ?, price = ? WHERE id = ?',
        [name, price, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Послуга не знайдена'
        });
      }

      res.json({
        success: true,
        message: 'Послугу оновлено'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Помилка сервера'
      });
    }
  }
);

//////////////////////////////////////////////////////
// 🔹 DELETE service
//////////////////////////////////////////////////////
router.delete(
  '/:id',
  [
    param('id')
      .isInt({ gt: 0 })
      .withMessage('ID має бути числом')
  ],
  handleValidationErrors,
  async (req, res) => {
    const { id } = req.params;

    try {
      const [result] = await db.execute(
        'DELETE FROM services WHERE id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Послуга не знайдена'
        });
      }

      res.json({
        success: true,
        message: 'Послугу видалено'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Помилка сервера'
      });
    }
  }
);

module.exports = router;