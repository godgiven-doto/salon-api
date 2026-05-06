const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 🔹 відправка email підтвердження
const sendVerificationEmail = async (email, link) => {
  try {
    await transporter.sendMail({
      from: `"Beauty Whisper" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Підтвердження реєстрації',
      html: `
        <div>
          <h2>Підтвердіть свій акаунт</h2>
          <p>Натисніть кнопку нижче:</p>
          <a href="${link}" 
             style="padding:10px 20px;background:#4CAF50;color:#fff;text-decoration:none;">
             Підтвердити email
          </a>
        </div>
      `
    });

    console.log('Email sent to:', email);
  } catch (error) {
    console.log('Email error:', error);
  }
};

module.exports = { sendVerificationEmail };