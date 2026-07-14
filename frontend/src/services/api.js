import axios from "axios";

export const API_URL = "http://localhost:4000";

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

export default api;