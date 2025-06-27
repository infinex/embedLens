import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Determine the base URL for the API. 
// This might come from an environment variable or be hardcoded if it's stable.
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // You can add other default headers here, like Authorization tokens if needed
    // For example, if you have a token in localStorage:
    // 'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : undefined,
  },
});

// Optional: Add a response interceptor for global error handling or token refresh logic
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response, // Simply return the response if it's successful
  (error: AxiosError) => {
    // Handle errors globally here
    // For example, redirect to login on 401 Unauthorized
    if (error.response && error.response.status === 401) {
      // Handle unauthorized access, e.g., redirect to login page
      // window.location.href = '/login';
      console.error('Unauthorized access (401). Consider redirecting to login or token refresh.');
    }
    // It's important to return a Promise.reject to pass the error to the calling code
    return Promise.reject(error);
  }
);

// Optional: Add a request interceptor to dynamically add auth tokens
// apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
//   const token = localStorage.getItem('userToken'); // Or however you store your token
//   if (token && config.headers) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

export default apiClient; 