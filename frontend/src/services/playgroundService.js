import api from '../utils/api';

/**
 * Playground Service - Handles all Simulation related API calls.
 */

// ===== Background APIs =====
export const getBackgrounds = async () => {
  try {
    const { data } = await api.get('/playground/backgrounds');
    return data;
  } catch (error) {
    console.error('[playgroundService] getBackgrounds failed:', error);
    throw error;
  }
};

export const createBackground = async (payload) => {
  try {
    const { data } = await api.post('/playground/backgrounds', payload);
    return data;
  } catch (error) {
    console.error('[playgroundService] createBackground failed:', error);
    throw error;
  }
};

export const updateBackground = async (id, payload) => {
  try {
    const { data } = await api.put(`/playground/backgrounds/${id}`, payload);
    return data;
  } catch (error) {
    console.error(`[playgroundService] updateBackground failed for ${id}:`, error);
    throw error;
  }
};

export const deleteBackground = async (id) => {
  try {
    const { data } = await api.delete(`/playground/backgrounds/${id}`);
    return data;
  } catch (error) {
    console.error(`[playgroundService] deleteBackground failed for ${id}:`, error);
    throw error;
  }
};

// ===== Simulation APIs =====
// Get all simulations for current user
export const getSimulations = async () => {
  try {
    const { data } = await api.get('/playground/simulations');
    return data;
  } catch (error) {
    console.error('[playgroundService] getSimulations failed:', error);
    throw error;
  }
};

// Get single simulation by ID
export const getSimulationById = async (id) => {
  try {
    const { data } = await api.get(`/playground/simulations/${id}`);
    return data;
  } catch (error) {
    console.error(`[playgroundService] getSimulationById failed for ${id}:`, error);
    throw error;
  }
};

// Create a new simulation
export const createSimulation = async (simulationData) => {
  try {
    const { data } = await api.post('/playground/simulations', simulationData);
    return data;
  } catch (error) {
    console.error('[playgroundService] createSimulation failed:', error);
    throw error;
  }
};

// Update an existing simulation
export const updateSimulation = async (id, simulationData) => {
  try {
    const { data } = await api.put(`/playground/simulations/${id}`, simulationData);
    return data;
  } catch (error) {
    console.error(`[playgroundService] updateSimulation failed for ${id}:`, error);
    throw error;
  }
};

// Delete a simulation
export const deleteSimulation = async (id) => {
  try {
    const { data } = await api.delete(`/playground/simulations/${id}`);
    return data;
  } catch (error) {
    console.error(`[playgroundService] deleteSimulation failed for ${id}:`, error);
    throw error;
  }
};

