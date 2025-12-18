import api from '../utils/api';

export const getCashFlows = async () => {
  const response = await api.get('/cashflow');
  return response.data;
};

export const createCashFlow = async (data) => {
  const response = await api.post('/cashflow', data);
  return response.data;
};

export const updateCashFlow = async (id, data) => {
  const response = await api.put(`/cashflow/${id}`, data);
  return response.data;
};

export const deleteCashFlow = async (id) => {
  const response = await api.delete(`/cashflow/${id}`);
  return response.data;
};

