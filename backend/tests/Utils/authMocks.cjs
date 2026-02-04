// tests/utils/authMocks.cjs

function createProtectMock({ objectId = true } = {}) {
  return (req, res, next) => {
    req.user = {
      _id: objectId ? "507f191e810c19729de860ea" : "507f191e...",
      id: objectId ? "507f191e810c19729de860ea" : "507f191e...",
      email: "test@example.com",
      name: "Test User",
    };
    next();
  };
}

module.exports = { createProtectMock };
