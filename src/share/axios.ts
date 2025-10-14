import axios from "axios";
import { env } from "process";

const instance = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
});

export default instance;
