import AboutSection3 from '@/components/ui/about-section';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
            <AboutSection3 />

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-300 py-12 mt-16">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {/* Company Info */}
                        <div>
                            <h3 className="text-white text-lg font-semibold mb-4">ShopEase</h3>
                            <p className="text-sm">
                                Your trusted online shopping destination for quality products and exceptional service.
                            </p>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h3 className="text-white text-lg font-semibold mb-4">Quick Links</h3>
                            <ul className="space-y-2 text-sm">
                                <li><a href="/" className="hover:text-white transition">Home</a></li>
                                <li><a href="/products" className="hover:text-white transition">Products</a></li>
                                <li><a href="/categories" className="hover:text-white transition">Categories</a></li>
                                <li><a href="/about" className="hover:text-white transition">About Us</a></li>
                            </ul>
                        </div>

                        {/* Customer Service */}
                        <div>
                            <h3 className="text-white text-lg font-semibold mb-4">Customer Service</h3>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#" className="hover:text-white transition">Contact Us</a></li>
                                <li><a href="#" className="hover:text-white transition">Track Order</a></li>
                                <li><a href="#" className="hover:text-white transition">Returns</a></li>
                                <li><a href="#" className="hover:text-white transition">Help Center</a></li>
                            </ul>
                        </div>

                        {/* Legal */}
                        <div>
                            <h3 className="text-white text-lg font-semibold mb-4">Legal</h3>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
                                <li><a href="#" className="hover:text-white transition">Shipping Policy</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
                        <p>&copy; 2025 ShopEase. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
