const { body, param, query } = require('express-validator');

exports.createAppointmentValidator = [
  body('datetime')
    .notEmpty().withMessage('Дата обовʼязкова')
    .isISO8601().withMessage('Некоректна дата'),

  body('serviceId')
    .isInt({ gt: 0 }).withMessage('serviceId має бути числом'),

  body('userId')
    .isInt({ gt: 0 }).withMessage('userId має бути числом'),

  body('masterId')
    .isInt({ gt: 0 }).withMessage('masterId має бути числом'),

  body('paymentMethod')
    .isIn(['online', 'offline']).withMessage('Некоректний метод оплати')
];

exports.slotsValidator = [
  query('date')
    .isISO8601().withMessage('Некоректна дата'),

  query('masterId')
    .isInt({ gt: 0 }).withMessage('masterId має бути числом')
];

exports.appointmentIdValidator = [
  param('id')
    .isInt({ gt: 0 }).withMessage('ID має бути числом')
];

exports.userIdValidator = [
  param('userId')
    .isInt({ gt: 0 }).withMessage('userId має бути числом')
];