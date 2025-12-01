import axios from "axios";

const instance = axios.create({
  baseURL: "http://localhost:8000",
  withCredentials: true,
});

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.status === 401) {
      const response = await instance.post("/api/refresh");
      if (response.status !== 200) {
        window.location.href = "/login";
      }
    }
  }
);

export default instance;
