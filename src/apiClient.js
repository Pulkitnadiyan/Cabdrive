import axios from "axios";

// Update the API_BASE to point to your deployed backend URL
const API_BASE = "https://cabride-backend.onrender.com/"; // Replace with your actual backend URL

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;