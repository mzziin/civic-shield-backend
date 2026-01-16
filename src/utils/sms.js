const twilio = require('twilio');

let twilioClient = null;

const initializeTwilio = () => {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
};

const sendOTP = async (mobileNumber, otp) => {
  if (!twilioClient) {
    console.log(`[SMS Mock] OTP for ${mobileNumber}: ${otp}`);
    return { success: true };
  }

  try {
    await twilioClient.messages.create({
      body: `Your verification code is: ${otp}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: mobileNumber
    });
    return { success: true };
  } catch (error) {
    console.error('Twilio error:', error);
    return { success: false, error: error.message };
  }
};

const sendDangerZoneAlert = async (mobileNumber, city) => {
  if (!twilioClient) {
    console.log(`[SMS Mock] Danger zone alert to ${mobileNumber} for city: ${city}`);
    return { success: true };
  }

  try {
    await twilioClient.messages.create({
      body: `⚠️ ALERT: ${city} has been marked as a danger zone due to multiple armed incidents. Please stay safe and avoid the area if possible.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: mobileNumber
    });
    return { success: true };
  } catch (error) {
    console.error('Twilio error:', error);
    return { success: false, error: error.message };
  }
};

// Initialize on module load
initializeTwilio();

module.exports = {
  sendOTP,
  sendDangerZoneAlert,
  initializeTwilio
};
