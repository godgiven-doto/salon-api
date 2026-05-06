const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const helmet = require('helmet');
const db = require('../config/db');
const bcrypt = require('bcrypt');
const { sendVerificationEmail } = require('../utils/mailer');

const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [user] = await db.query(
      'SELECT id, name, email, is_verified FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      user: user[0]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Помилка сервера'
    });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Невірний email або пароль'
      });
    }

    const user = users[0];

 
    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Підтвердіть email'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Невірний email або пароль'
      });
    }

   
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: user.role  
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      token
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
// 🔐 SECURITY MIDDLEWARE
//////////////////////////////////////////////////////

router.use(helmet());

// обмеження запитів (anti brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хв
  max: 20, // 20 запитів
  message: {
    success: false,
    message: 'Забагато запитів, спробуйте пізніше'
  }
});

//////////////////////////////////////////////////////
// 🔹 REGISTER
//////////////////////////////////////////////////////
router.post(
  '/register',
  authLimiter,

  // 🔐 validation
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Імʼя має бути 2-50 символів'),

    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Некоректний email'),

    body('password')
      .isLength({ min: 6, max: 100 })
      .withMessage('Пароль має бути мінімум 6 символів')
  ],

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, email, password } = req.body;

    try {
      // 1. перевірка email
      const [existing] = await db.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email вже використовується'
        });
      }

      // 2. хеш пароля
      const hashedPassword = await bcrypt.hash(password, 10);

      // 3. токен підтвердження
      const token = crypto.randomBytes(32).toString('hex');

      const [result] = await db.query(
        `INSERT INTO users (name, email, password, verify_token, is_verified, role)
        VALUES (?, ?, ?, ?, 0, 'client')`,
        [name || 'User', email, hashedPassword, token]
      );

      // 4. verify link
      const verifyLink = `https://shut-unwashed-agonizing.ngrok-free.dev/auth/verify?token=${token}`;

      await sendVerificationEmail(email, verifyLink);

      res.status(201).json({
        success: true,
        message: 'Користувача створено. Перевір email',
        userId: result.insertId
      });

    } catch (error) {
      console.log('REGISTER ERROR:', error);

      res.status(500).json({
        success: false,
        message: 'Помилка сервера'
      });
    }
  }
);

//////////////////////////////////////////////////////
// 🔹 VERIFY EMAIL
//////////////////////////////////////////////////////
router.get('/verify', async (req, res) => {
  const { token } = req.query;

  try {
    if (!token) {
      return res.status(400).send('Токен відсутній');
    }

    const [users] = await db.query(
      'SELECT id FROM users WHERE verify_token = ?',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).send('Невірний або прострочений токен');
    }

    const userId = users[0].id;

    await db.query(
      `UPDATE users 
       SET is_verified = 1, verify_token = NULL 
       WHERE id = ?`,
      [userId]
    );

    res.send('Email підтверджено ✅');

  } catch (error) {
    console.log(error);
    res.status(500).send('Помилка сервера');
  }
});

module.exports = router;