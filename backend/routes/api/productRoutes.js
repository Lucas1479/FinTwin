import express from 'express';
import {
  getProducts,
  getProductById,
  getProductsByCategory,
  getProductsByStrategy,
  getProductStats,
  compareProducts,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../controllers/productController.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = express.Router();

// ==========================================
// Public Endpoints (No Auth Required)
// ==========================================

// GET /api/products - List all products with filters
router.get('/', getProducts);

// GET /api/products/stats - Get aggregate statistics
router.get('/stats', getProductStats);

// GET /api/products/search - Full-text search
router.get('/search', searchProducts);

// GET /api/products/category/:category - Filter by category
router.get('/category/:category', getProductsByCategory);

// GET /api/products/strategy/:strategy - Filter by strategy
router.get('/strategy/:strategy', getProductsByStrategy);

// POST /api/products/compare - Compare multiple products
router.post('/compare', compareProducts);

// GET /api/products/:id - Get single product details
router.get('/:id', getProductById);

// ==========================================
// Protected Endpoints (Auth Required)
// ==========================================

// POST /api/products - Create product (Admin)
router.post('/', protect, createProduct);

// PUT /api/products/:id - Update product (Admin)
router.put('/:id', protect, updateProduct);

// DELETE /api/products/:id - Soft delete product (Admin)
router.delete('/:id', protect, deleteProduct);

export default router;
