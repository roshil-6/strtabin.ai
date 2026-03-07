// Time constants
export const ONE_DAY = 24 * 60 * 60 * 1000;
export const ONE_WEEK = 7 * ONE_DAY;

// Storage
export const STORAGE_KEY = 'strategy-box-storage';
export const LEGACY_STORAGE_KEY = 'startergy-box-storage';

// External links
export const RAZORPAY_LINK = 'https://rzp.io/rzp/vxWpvWM';

// API
const _apiUrl = import.meta.env.VITE_API_URL;
if (!_apiUrl && import.meta.env.PROD) {
  console.error(
    '⚠️  VITE_API_URL is not set. AI features will not work. Add it to your Vercel environment variables.'
  );
}
export const API_BASE_URL = _apiUrl || 'http://localhost:3001';
