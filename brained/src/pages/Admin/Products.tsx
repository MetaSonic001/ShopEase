import React, { useEffect, useState } from 'react';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../../services/products';
import { Upload, X, Plus, Edit2, Trash2, Star, Image as ImageIcon } from 'lucide-react';

interface ProductForm {
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  image: string;
  images: string[];
  colors: { id: string; name: string; class: string }[];
  sizes: { name: string; inStock: boolean }[];
  highlights: string[];
  details: string;
  stock: number;
  rating: number;
  reviewCount: number;
  badge: string;
  featured: boolean;
}

const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const emptyForm: ProductForm = {
    title: '',
    description: '',
    price: 0,
    originalPrice: 0,
    category: '',
    image: '',
    images: [],
    colors: [],
    sizes: [],
    highlights: [],
    details: '',
    stock: 0,
    rating: 0,
    reviewCount: 0,
    badge: '',
    featured: false,
  };

  const [form, setForm] = useState<ProductForm>(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleImageUpload = (files: FileList | null, isGallery = false) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (isGallery) {
          setForm((prev) => ({ ...prev, images: [...prev.images, base64] }));
        } else {
          setForm((prev) => ({ ...prev, image: base64 }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent, isGallery = false) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleImageUpload(e.dataTransfer.files, isGallery);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const removeImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const addColor = () => {
    setForm((prev) => ({
      ...prev,
      colors: [...prev.colors, { id: '', name: '', class: '' }],
    }));
  };

  const updateColor = (index: number, field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      colors: prev.colors.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  const removeColor = (index: number) => {
    setForm((prev) => ({
      ...prev,
      colors: prev.colors.filter((_, i) => i !== index),
    }));
  };

  const addSize = () => {
    setForm((prev) => ({
      ...prev,
      sizes: [...prev.sizes, { name: '', inStock: true }],
    }));
  };

  const updateSize = (index: number, field: string, value: any) => {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      ),
    }));
  };

  const removeSize = (index: number) => {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== index),
    }));
  };

  const addHighlight = () => {
    setForm((prev) => ({
      ...prev,
      highlights: [...prev.highlights, ''],
    }));
  };

  const updateHighlight = (index: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      highlights: prev.highlights.map((h, i) => (i === index ? value : h)),
    }));
  };

  const removeHighlight = (index: number) => {
    setForm((prev) => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index),
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateProduct(editingId, form);
        setEditingId(null);
      } else {
        await createProduct(form);
      }
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      await deleteProduct(id);
      await load();
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (product: any) => {
    setEditingId(product._id);
    setForm({
      title: product.title || '',
      description: product.description || '',
      price: product.price || 0,
      originalPrice: product.originalPrice || 0,
      category: product.category || '',
      image: product.image || '',
      images: product.images || [],
      colors: product.colors || [],
      sizes: product.sizes || [],
      highlights: product.highlights || [],
      details: product.details || '',
      stock: product.stock || 0,
      rating: product.rating || 0,
      reviewCount: product.reviewCount || 0,
      badge: product.badge || '',
      featured: product.featured || false,
    });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Manage Products</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Product'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-6">
            {editingId ? 'Edit Product' : 'Create New Product'}
          </h3>
          <form onSubmit={submit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Product title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g., Electronics, Fashion"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price *
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) =>
                    setForm({ ...form, price: Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Original Price (optional)
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  value={form.originalPrice}
                  onChange={(e) =>
                    setForm({ ...form, originalPrice: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0"
                  type="number"
                  value={form.stock}
                  onChange={(e) =>
                    setForm({ ...form, stock: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Badge
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g., Sale, New, Best Seller"
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Short product description"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Detailed Description
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Full product details"
                rows={4}
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
              />
            </div>

            {/* Main Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Main Image
              </label>
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 text-center ${
                  dragActive
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={(e) => handleDrop(e, false)}
              >
                {form.image ? (
                  <div className="relative inline-block">
                    <img
                      src={form.image}
                      alt="Main"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, image: '' })}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      Drag and drop or click to upload
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e.target.files, false)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Gallery Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gallery Images
              </label>
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 ${
                  dragActive
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={(e) => handleDrop(e, true)}
              >
                <div className="flex flex-wrap gap-3 mb-4">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative">
                      <img
                        src={img}
                        alt={`Gallery ${i}`}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <ImageIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Drag multiple images or click to upload
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(e.target.files, true)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Colors */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Colors
              </label>
              <div className="space-y-2">
                {form.colors.map((color, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className="flex-1 border border-gray-300 rounded-lg p-2"
                      placeholder="ID (e.g., black)"
                      value={color.id}
                      onChange={(e) => updateColor(i, 'id', e.target.value)}
                    />
                    <input
                      className="flex-1 border border-gray-300 rounded-lg p-2"
                      placeholder="Name (e.g., Black)"
                      value={color.name}
                      onChange={(e) => updateColor(i, 'name', e.target.value)}
                    />
                    <input
                      className="flex-1 border border-gray-300 rounded-lg p-2"
                      placeholder="Class (e.g., bg-gray-900)"
                      value={color.class}
                      onChange={(e) => updateColor(i, 'class', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeColor(i)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addColor}
                  className="text-sm text-orange-600 hover:text-orange-700"
                >
                  + Add Color
                </button>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sizes
              </label>
              <div className="space-y-2">
                {form.sizes.map((size, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className="flex-1 border border-gray-300 rounded-lg p-2"
                      placeholder="Size (e.g., M, L, XL)"
                      value={size.name}
                      onChange={(e) => updateSize(i, 'name', e.target.value)}
                    />
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={size.inStock}
                        onChange={(e) =>
                          updateSize(i, 'inStock', e.target.checked)
                        }
                      />
                      <span className="text-sm">In Stock</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeSize(i)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSize}
                  className="text-sm text-orange-600 hover:text-orange-700"
                >
                  + Add Size
                </button>
              </div>
            </div>

            {/* Highlights */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Highlights
              </label>
              <div className="space-y-2">
                {form.highlights.map((highlight, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className="flex-1 border border-gray-300 rounded-lg p-2"
                      placeholder="Feature highlight"
                      value={highlight}
                      onChange={(e) => updateHighlight(i, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeHighlight(i)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addHighlight}
                  className="text-sm text-orange-600 hover:text-orange-700"
                >
                  + Add Highlight
                </button>
              </div>
            </div>

            {/* Rating & Reviews */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rating (0-5)
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="4.5"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={form.rating}
                  onChange={(e) =>
                    setForm({ ...form, rating: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Review Count
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0"
                  type="number"
                  value={form.reviewCount}
                  onChange={(e) =>
                    setForm({ ...form, reviewCount: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            {/* Featured */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="featured"
                checked={form.featured}
                onChange={(e) =>
                  setForm({ ...form, featured: e.target.checked })
                }
                className="w-4 h-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
              />
              <label
                htmlFor="featured"
                className="text-sm font-medium text-gray-700"
              >
                Feature this product
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all font-medium"
              >
                {editingId ? 'Update Product' : 'Create Product'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Products List */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4">All Products</h3>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No products yet. Create your first product!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {products.map((p) => (
              <div
                key={p._id}
                className="flex items-center gap-4 border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-all"
              >
                <img
                  src={p.image || 'https://via.placeholder.com/100'}
                  alt={p.title}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-lg">{p.title}</h4>
                      <p className="text-sm text-gray-600">
                        ${p.price} • {p.category || 'Uncategorized'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Stock: {p.stock || 0} • Rating: {p.rating || 0}/5 (
                        {p.reviewCount || 0} reviews)
                      </p>
                    </div>
                    {p.featured && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                        <Star className="w-3 h-3 fill-orange-500" />
                        Featured
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(p)}
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      const updated = { featured: !p.featured };
                      await updateProduct(p._id, updated);
                      load();
                    }}
                    className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-all"
                    title="Toggle Featured"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        p.featured ? 'fill-orange-500' : ''
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => onDelete(p._id)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProducts;
