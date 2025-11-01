const Product = require('../models/Product');
const { authenticate } = require('./authController');

exports.createProduct = async (req, res) => {
  try {
    // simple create; require authentication
    // You may add role checks here later
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const productData = req.body;
    const p = await Product.create(productData);
    res.status(201).json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).limit(100);
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getFeatured = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 5, 50);
    const featured = await Product.find({ featured: true }).sort({ createdAt: -1 }).limit(limit);
    // if no featured, fallback to first N products
    if (!featured || featured.length === 0) {
      const fallback = await Product.find().sort({ createdAt: -1 }).limit(limit);
      return res.json(fallback);
    }
    res.json(featured);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;
    const updates = req.body;
    const p = await Product.findByIdAndUpdate(id, updates, { new: true });
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;
    const p = await Product.findByIdAndDelete(id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
