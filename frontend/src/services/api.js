import axios from "axios";

export const API_URL = "http://localhost:4000";

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

export async function getCheckStatus(checkId) {
  const response = await api.get(
    `/checks/${checkId}/status`
  );

  return response.data;
}

export default api;