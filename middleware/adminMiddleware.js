module.exports = (req, res, next) => {
  try {

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Немає авторизації'
      });
    }


    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Доступ дозволений тільки адміністратору'
      });
    }

    next();

  } catch (error) {
    console.log('ADMIN MIDDLEWARE ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'Помилка перевірки доступу'
    });
  }
};