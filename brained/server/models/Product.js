const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    originalPrice: { type: Number }, // for showing discounts
    category: { type: String },
    featured: { type: Boolean, default: false },
    // Seeded data identifier (starts with SEED- for seeded items, null for user-created)
    seededId: { type: String, default: null, index: true },
    // Main image (base64 or URL)
    image: { type: String },
    // Gallery images array (base64 or URLs)
    images: [{ type: String }],
    // Colors available
    colors: [
      {
        id: String,
        name: String,
        class: String, // Tailwind class like 'bg-gray-900'
      }
    ],
    // Sizes available
    sizes: [
      {
        name: String,
        inStock: { type: Boolean, default: true }
      }
    ],
    // Product highlights
    highlights: [{ type: String }],
    // Detailed description
    details: { type: String },
    // Stock quantity
    stock: { type: Number, default: 0 },
    // Rating and reviews
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    // Badge (Sale, New, Best Seller, etc.)
    badge: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
