/**
 * Create a mongoose-like query mock that supports common chains.
 */
export const mockQuery = (result) => {
  const q = {
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  };

  // allow: await Model.findById(...) (thenable)
  q.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  q.catch = (reject) => Promise.resolve(result).catch(reject);

  return q;
};
