import productsData from '../models/productsData.js';

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getAllProducts = (req, res) => {
  try {
    return res.json({
      success: true,
      data: productsData,
      count: productsData.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message,
    });
  }
};

// @desc    Get single product by id
// @route   GET /api/products/:id
// @access  Public
export const getProductById = (req, res) => {
  try {
    const product = productsData.find((p) => p.id === req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    return res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message,
    });
  }
};





