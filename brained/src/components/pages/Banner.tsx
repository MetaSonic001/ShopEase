import React from "react";

const Banner: React.FC = () => {
  return (
    <section className="relative w-full h-screen">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="/ecom.jpg"
            alt="Shopping background"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Dark Overlay */}
        <div className="relative inset-0 bg-black bg-opacity-80"></div>

        {/* Content */}
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="w-full px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Quality Products at Great Prices
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-gray-200 mb-10 leading-relaxed mx-auto">
              Discover our curated collection of products. Shop with confidence
              and enjoy fast, reliable delivery.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href="/login" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-10 py-4 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all duration-300 text-lg shadow-lg hover:shadow-xl hover:scale-105 transform">
                  Sign Up / Sign In
                </button>
              </a>

              <a href="#products" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-10 py-4 bg-transparent text-white border-2 border-white rounded-lg font-semibold hover:bg-white hover:text-gray-900 transition-all duration-300 text-lg hover:scale-105 transform">
                  Browse Featured
                </button>
              </a>
            </div>

            {/* Features */}
            <div className="mt-16 flex flex-wrap justify-center items-center gap-8 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Free Shipping</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>
  );
};

export default Banner;