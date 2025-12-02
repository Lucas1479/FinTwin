import api from '../utils/api';

// Create a new goal
export const createGoal = async (payload) => {
  const { data } = await api.post('/goals', payload);
  return data;
};

// Fetch all goals for the current user
export const getGoals = async (params = {}) => {
  const { data } = await api.get('/goals', { params });
  return data;
};

// Fetch a single goal by id
export const getGoalById = async (id) => {
  const { data } = await api.get(`/goals/${id}`);
  return data;
};

// Update an existing goal
export const updateGoal = async (id, payload) => {
  const { data } = await api.put(`/goals/${id}`, payload);
  return data;
};

// Delete a goal
export const deleteGoal = async (id) => {
  const { data } = await api.delete(`/goals/${id}`);
  return data;
};


