// In-memory OTP store (use Redis in production)
const otpStore = new Map();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const storeOTP = (mobileNumber, otp) => {
  const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
  otpStore.set(mobileNumber, { otp, expiry });
  
  // Auto-cleanup after expiry
  setTimeout(() => {
    otpStore.delete(mobileNumber);
  }, 10 * 60 * 1000);
};

const verifyOTP = (mobileNumber, otp) => {
  const stored = otpStore.get(mobileNumber);
  if (!stored) return false;
  
  if (Date.now() > stored.expiry) {
    otpStore.delete(mobileNumber);
    return false;
  }
  
  if (stored.otp === otp) {
    otpStore.delete(mobileNumber);
    return true;
  }
  
  return false;
};

const getOTPRequestCount = (mobileNumber) => {
  // Simple rate limiting - count requests in last hour
  // In production, use Redis with TTL
  return 0; // Simplified for now
};

module.exports = {
  generateOTP,
  storeOTP,
  verifyOTP,
  getOTPRequestCount
};
