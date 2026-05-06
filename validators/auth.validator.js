const { body } = require('express-validator');

exports.registerValidator = [
  body('email')
    .isEmail().withMessage('Некоректний email'),

  body('password')
    .isLength({ min: 6 }).withMessage('Пароль мінімум 6 символів')
];

exports.loginValidator = [
  body('email')
    .isEmail().withMessage('Некоректний email'),

  body('password')
    .notEmpty().withMessage('Пароль обовʼязковий')
];