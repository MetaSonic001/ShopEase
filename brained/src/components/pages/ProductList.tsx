import React, { useState } from 'react';
import { ShoppingCart, Heart, Eye } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
  price: string;
  originalPrice?: string;
  color: string;
  category: string;
  rating: number;
  reviews: number;
  badge?: string;
}

const products: Product[] = [
  {
    id: 1,
    name: 'Classic Leather Jacket',
    href: '#',
    imageSrc: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&h=500&fit=crop',
    imageAlt: "Brown leather jacket",
    price: '$189',
    originalPrice: '$249',
    color: 'Cognac Brown',
    category: 'Fashion',
    rating: 4.5,
    reviews: 127,
    badge: 'Sale'
  },
  {
    id: 2,
    name: 'Wireless Headphones',
    href: '#',
    imageSrc: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
    imageAlt: "Wireless headphones",
    price: '$129',
    color: 'Matte Black',
    category: 'Electronics',
    rating: 4.8,
    reviews: 342,
    badge: 'Best Seller'
  },
  {
    id: 3,
    name: 'Running Shoes',
    href: '#',
    imageSrc: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop',
    imageAlt: "Red and white running shoes",
    price: '$95',
    color: 'Sport Red',
    category: 'Sports',
    rating: 4.6,
    reviews: 218,
  },
  {
    id: 4,
    name: 'Smart Watch',
    href: '#',
    imageSrc: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop',
    imageAlt: "Smart watch on display",
    price: '$249',
    originalPrice: '$299',
    color: 'Space Gray',
    category: 'Electronics',
    rating: 4.7,
    reviews: 451,
    badge: 'New'
  },
  {
    id: 5,
    name: 'Laptop Backpack',
    href: '#',
    imageSrc: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&h=500&fit=crop',
    imageAlt: "Gray laptop backpack",
    price: '$59',
    color: 'Charcoal Gray',
    category: 'Accessories',
    rating: 4.4,
    reviews: 89,
  },
  {
    id: 6,
    name: 'Coffee Maker',
    href: '#',
    imageSrc: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=500&h=500&fit=crop',
    imageAlt: "Modern coffee maker",
    price: '$79',
    color: 'Stainless Steel',
    category: 'Home',
    rating: 4.9,
    reviews: 176,
    badge: 'Top Rated'
  },
  {
    id: 7,
    name: 'Sunglasses',
    href: '#',
    imageSrc: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&h=500&fit=crop',
    imageAlt: "Classic aviator sunglasses",
    price: '$149',
    color: 'Classic Gold',
    category: 'Accessories',
    rating: 4.3,
    reviews: 94,
  },
  {
    id: 8,
    name: 'Desk Lamp',
    href: '#',
    imageSrc: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&h=500&fit=crop',
    imageAlt: "Modern desk lamp",
    price: '$45',
    originalPrice: '$65',
    color: 'Matte White',
    category: 'Home',
    rating: 4.5,
    reviews: 63,
    badge: 'Sale'
  },
];

const ProductList: React.FC = () => {
  const [favorites, setFavorites] = useState<number[]>([]);

  const toggleFavorite = (productId: number) => {
    setFavorites(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' :
              star - 0.5 <= rating ? 'text-yellow-400 fill-yellow-400' :
                'text-gray-300 fill-gray-300'
              }`}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* <div className="h-20 sm:h-14"></div> */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-3">
            Featured Products
          </h2>
          <p className="text-lg text-gray-600">
            Discover our curated selection of quality products
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="group relative bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              {/* Badge */}
              {product.badge && (
                <div className="absolute top-3 left-3 z-10">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${product.badge === 'Sale' ? 'bg-red-500 text-white' :
                    product.badge === 'New' ? 'bg-green-500 text-white' :
                      product.badge === 'Best Seller' ? 'bg-orange-500 text-white' :
                        'bg-blue-500 text-white'
                    }`}>
                    {product.badge}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button
                  onClick={() => toggleFavorite(product.id)}
                  className={`p-2 rounded-full backdrop-blur-sm transition-all ${favorites.includes(product.id)
                    ? 'bg-red-500 text-white'
                    : 'bg-white/90 text-gray-700 hover:bg-white'
                    }`}
                  aria-label="Add to favorites"
                >
                  <Heart className={`w-4 h-4 ${favorites.includes(product.id) ? 'fill-current' : ''}`} />
                </button>
                <button
                  className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-700 hover:bg-white transition-all"
                  aria-label="Quick view"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              {/* Image */}
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                <img
                  src={product.imageSrc}
                  alt={product.imageAlt}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>

              {/* Product Info */}
              <div className="p-4">
                {/* Category */}
                <p className="text-xs font-medium text-orange-600 mb-1">{product.category}</p>

                {/* Name */}
                <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-1">
                  <a href={product.href}>
                    {product.name}
                  </a>
                </h3>

                {/* Color */}
                <p className="text-sm text-gray-500 mb-2">{product.color}</p>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-3">
                  {renderStars(product.rating)}
                  <span className="text-xs text-gray-500">({product.reviews})</span>
                </div>

                {/* Price and Add to Cart */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">{product.price}</span>
                    {product.originalPrice && (
                      <span className="text-sm text-gray-400 line-through">{product.originalPrice}</span>
                    )}
                  </div>
                  <button
                    className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all hover:scale-105"
                    aria-label="Add to cart"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button */}
        <div className="mt-12 text-center">
          <button className="px-8 py-3 bg-white text-gray-900 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all">
            Load More Products
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductList;