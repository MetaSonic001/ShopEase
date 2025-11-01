const express = require('express');
const router = express.Router();
const productsController = require('../controllers/productsController');
const { authenticate } = require('../controllers/authController');

// public list
router.get('/', productsController.getProducts);
// featured (must come before /:id to avoid conflict)
router.get('/featured', productsController.getFeatured);
// get single product by ID
router.get('/:id', productsController.getProductById);

// protected admin routes (only admin role allowed)
const { authorize } = require('../controllers/authController');
router.post('/', authorize(['admin']), productsController.createProduct);
router.put('/:id', authorize(['admin']), productsController.updateProduct);
router.delete('/:id', authorize(['admin']), productsController.deleteProduct);

module.exports = router;
