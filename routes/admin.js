const express = require('express');
const router = express.Router();

const db = require('../config/db');

const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

//////////////////////////////////////////////////////
// 🔹 GET ALL APPOINTMENTS (ADMIN)
//////////////////////////////////////////////////////
router.get('/appointments', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.*, u.name AS user_name
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.id DESC
    `);

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: 'Помилка сервера'
    });
  }
});

//////////////////////////////////////////////////////
// 🔹 DELETE APPOINTMENT (ADMIN)
//////////////////////////////////////////////////////
router.delete('/appointments/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query(
      'DELETE FROM appointments WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Запис не знайдено'
      });
    }

    res.json({
      success: true,
      message: 'Запис видалено'
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: 'Помилка сервера'
    });
  }
});

module.exports = router;