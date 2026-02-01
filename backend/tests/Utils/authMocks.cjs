const mongoose = require('mongoose');

/**
 * Factory to create a simple auth bypass middleware.
 *
 * Usage:
 *   jest.mock('../middleware/authMiddleware.js', () => {
 *     const { createProtectMock } = require('./utils/authMocks.cjs');
 *     return { protect: createProtectMock({ objectId: true }) };
 *   });
 */
function createProtectMock({ objectId = false, id = '507f191e810c19729de860ea' } = {}) {
  return (req, _res, next) => {
    req.user = {
      _id: objectId ? new mongoose.Types.ObjectId(id) : id,
    };
    next();
  };
}

module.exports = { createProtectMock };
