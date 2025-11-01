import api from './api';

export const getProducts = async () => {
  const res = await api.get('/api/products');
  return res.data;
};

export const getProductById = async (id: string) => {
  const res = await api.get(`/api/products/${id}`);
  return res.data;
};

export const getFeatured = async (limit = 5) => {
  const res = await api.get('/api/products/featured', { params: { limit } });
  return res.data;
};

export const createProduct = async (payload: any) => {
  const res = await api.post('/api/products', payload);
  return res.data;
};

export const updateProduct = async (id: string, payload: any) => {
  const res = await api.put(`/api/products/${id}`, payload);
  return res.data;
};

export const deleteProduct = async (id: string) => {
  const res = await api.delete(`/api/products/${id}`);
  return res.data;
};
