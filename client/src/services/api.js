import axios from 'axios';

export const TOKEN_KEY = 'annz_token';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

/* -- Attach JWT to every request -- */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* -- Expired/invalid session: clear token and send to login -- */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    if (err.response?.status === 401 && !url.includes('/auth/')) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.assign('/login');
    }
    return Promise.reject(err);
  }
);

/* -- Auth endpoints -- */
export const register = (name, email, password) =>
  api.post('/auth/register', { name, email, password }).then((r) => r.data);
export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);
export const me = () => api.get('/auth/me').then((r) => r.data);

/* -- Product endpoints -- */
export const fetchProducts = () => api.get('/products').then((r) => r.data);
export const fetchProduct = (id) => api.get(`/products/${id}`).then((r) => r.data);
export const createProduct = (data) => api.post('/products', data).then((r) => r.data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data).then((r) => r.data);
export const deleteProduct = (id) => api.delete(`/products/${id}`).then((r) => r.data);

/* -- Cart endpoints -- */
export const fetchCart = () => api.get('/cart').then((r) => r.data);
export const addToCart = (productId, quantity = 1) =>
  api.post('/cart', { productId, quantity }).then((r) => r.data);
export const mergeCart = (items) => api.post('/cart/merge', { items }).then((r) => r.data);
export const updateCartItem = (id, quantity) =>
  api.put(`/cart/${id}`, { quantity }).then((r) => r.data);
export const removeCartItem = (id) => api.delete(`/cart/${id}`).then((r) => r.data);

/* -- Order endpoints -- */
export const createOrder = (payload) => api.post('/orders', payload).then((r) => r.data);
export const fetchOrders = () => api.get('/orders').then((r) => r.data);
export const fetchOrder = (id) => api.get(`/orders/${id}`).then((r) => r.data);

/* -- Store config -- */
export const fetchConfig = () => api.get('/config').then((r) => r.data);

/* -- Review endpoints -- */
export const fetchProductReviews = (productId) =>
  api.get(`/reviews/product/${productId}`).then((r) => r.data);
export const fetchMyReviews = () => api.get('/reviews/mine').then((r) => r.data);
export const createReview = (formData) =>
  api
    .post('/reviews', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data);

/* -- Admin endpoints -- */
export const fetchAdminStats = () => api.get('/admin/stats').then((r) => r.data);
export const fetchAdminSalesReport = (period) =>
  api.get('/admin/sales-report', { params: { period } }).then((r) => r.data);
export const fetchAdminOrders = () => api.get('/admin/orders').then((r) => r.data);
export const updateOrderStatus = (id, status) =>
  api.patch(`/admin/orders/${id}/status`, { status }).then((r) => r.data);
export const updateOrderTracking = (id, trackingNumber, carrier) =>
  api.patch(`/admin/orders/${id}/tracking`, { trackingNumber, carrier }).then((r) => r.data);
export const fetchAdminCustomers = () => api.get('/admin/customers').then((r) => r.data);
export const updateCustomerRole = (id, role) =>
  api.patch(`/admin/customers/${id}/role`, { role }).then((r) => r.data);
/* Static gallery manifest (baked at build by scripts/gen-image-manifest.js).
   Served directly from /public so it works on Vercel without a serverless read. */
export const fetchAdminImages = () =>
  fetch('/images-manifest.json').then((r) => r.json());
export const fetchAdminReviews = () => api.get('/admin/reviews').then((r) => r.data);
export const replyToReview = (id, text) =>
  api.patch(`/admin/reviews/${id}/reply`, { text }).then((r) => r.data);
export const deleteReview = (id) => api.delete(`/admin/reviews/${id}`).then((r) => r.data);
