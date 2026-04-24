import axios from 'axios';

const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://aireportingstudio.onrender.com/api' : '/api');
const baseURL = rawBaseUrl.replace(/\/+$/, '');

export const api = axios.create({ baseURL });
