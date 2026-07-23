import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Attach the JWT to every outgoing request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('quickbill_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the token is invalid/expired, redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('quickbill_token');
      localStorage.removeItem('quickbill_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;