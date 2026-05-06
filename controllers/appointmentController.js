const appointmentService = require('../services/appointmentService');

// 🔹 Отримати всі записи
exports.getAllAppointments = async (req, res) => {
  try {
    const data = await appointmentService.getAllAppointments();

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('getAllAppointments error:', error);

    res.status(500).json({
      success: false,
      message: 'Помилка сервера'
    });
  }
};

// 🔹 Отримати записи користувача
exports.getUserAppointments = async (req, res) => {
  try {
    const { userId } = req.params;

    const data = await appointmentService.getAppointmentsByUser(userId);

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('getUserAppointments error:', error);

    res.status(500).json({
      success: false,
      message: 'Помилка сервера'
    });
  }
};

// 🔹 Видалити запис
exports.deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const affectedRows = await appointmentService.deleteAppointment(id);

    if (!affectedRows) {
      return res.status(404).json({
        success: false,
        message: 'Запис не знайдено'
      });
    }

    res.json({
      success: true,
      message: 'Запис успішно видалено'
    });

  } catch (error) {
    console.error('deleteAppointment error:', error);

    res.status(500).json({
      success: false,
      message: 'Помилка сервера'
    });
  }
};

// 🔵 НОВЕ: майбутній хук для створення запису (з оплатою)
exports.createAppointment = async (req, res) => {
  try {
    const result = await appointmentService.createAppointment(req.body);

    res.status(201).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('createAppointment error:', error);

    res.status(500).json({
      success: false,
      message: 'Помилка сервера'
    });
  }
};