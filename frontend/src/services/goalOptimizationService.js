import api from '../utils/api';

const goalOptimizationService = {
  optimizeAllocations: async ({ goalContext, options = {} }) => {
    const response = await api.post('/goals/engine/optimize', {
      goalContext,
      options
    });
    return response.data;
  }
};

export default goalOptimizationService;

