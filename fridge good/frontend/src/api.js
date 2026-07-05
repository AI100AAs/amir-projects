import axios from "axios";
import toast from "react-hot-toast";

const api = axios.create({ baseURL: "http://localhost:8000" });

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err.response?.data?.detail || err.message || "Something went wrong";
    toast.error(msg);
    return Promise.reject(err);
  }
);

export default api;
