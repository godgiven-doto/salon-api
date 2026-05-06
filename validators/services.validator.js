const { body, param } = require('express-validator');

exports.createServiceValidator = [
  body('name')
    .notEmpty().withMessage('Назва обовʼязкова')
    .isLength({ min: 2 }).withMessage('Назва занадто коротка'),

  body('price')
    .notEmpty().withMessage('Ціна обовʼязкова')
    .isFloat({ gt: 0 }).withMessage('Ціна має бути більше 0')
];

exports.updateServiceValidator = [
  param('id')
    .isInt({ gt: 0 }).withMessage('ID має бути числом'),

  body('name')
    .optional()
    .notEmpty().withMessage('Назва не може бути пустою'),

  body('price')
    .optional()
    .isFloat({ gt: 0 }).withMessage('Ціна має бути більше 0')
];

exports.serviceIdValidator = [
  param('id')
    .isInt({ gt: 0 }).withMessage('ID має бути числом')
];