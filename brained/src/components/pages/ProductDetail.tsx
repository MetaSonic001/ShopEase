import { useParams, useNavigate } from 'react-router-dom';
import { StarIcon } from '@heroicons/react/20/solid';
import Navbar from './Navbar';

// TODO: In the future, fetch this data from an API based on the product ID
// For now, we'll use static data but structure it to be easily replaceable
const getProductById = (id: string) => {
    // FUTURE IMPLEMENTATION:
    // const response = await fetch(`/api/products/${id}`);
    // return await response.json();

    // Static data for now - replace with API call
    const products: { [key: string]: any } = {
        '1': {
            id: 1,
            name: 'Classic Leather Jacket',
            price: 189,
            category: 'Fashion',
            image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&h=500&fit=crop',
            images: [
                {
                    src: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=800&fit=crop',
                    alt: 'Leather Jacket Front View',
                },
                {
                    src: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=600&fit=crop',
                    alt: 'Leather Jacket Side View',
                },
                {
                    src: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=600&fit=crop',
                    alt: 'Leather Jacket Detail',
                },
                {
                    src: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1000&h=1200&fit=crop',
                    alt: 'Leather Jacket Full',
                },
            ],
            colors: [
                { id: 'black', name: 'Black', classes: 'bg-gray-900 checked:outline-gray-900' },
                { id: 'brown', name: 'Brown', classes: 'bg-amber-800 checked:outline-amber-800' },
            ],
            sizes: [
                { name: 'XS', inStock: true },
                { name: 'S', inStock: true },
                { name: 'M', inStock: true },
                { name: 'L', inStock: true },
                { name: 'XL', inStock: true },
                { name: '2XL', inStock: false },
            ],
            description:
                'Premium quality leather jacket crafted from genuine leather. Features a classic design with modern touches, perfect for any casual or semi-formal occasion. Durable, comfortable, and stylish.',
            highlights: [
                'Genuine leather construction',
                'Multiple interior pockets',
                'YKK zippers throughout',
                'Breathable lining',
            ],
            details:
                'This jacket is made from top-grain leather and features a tailored fit. It includes two exterior pockets, two interior pockets, and adjustable cuffs for the perfect fit.',
        },
        '2': {
            id: 2,
            name: 'Wireless Headphones',
            price: 129,
            category: 'Electronics',
            image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
            images: [
                {
                    src: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop',
                    alt: 'Wireless Headphones',
                },
                {
                    src: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600&fit=crop',
                    alt: 'Headphones Detail',
                },
                {
                    src: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600&fit=crop',
                    alt: 'Headphones Side View',
                },
                {
                    src: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1000&h=1200&fit=crop',
                    alt: 'Headphones Full View',
                },
            ],
            colors: [
                { id: 'black', name: 'Black', classes: 'bg-gray-900 checked:outline-gray-900' },
                { id: 'silver', name: 'Silver', classes: 'bg-gray-400 checked:outline-gray-400' },
            ],
            sizes: [
                { name: 'Standard', inStock: true },
            ],
            description:
                'Premium wireless headphones with active noise cancellation. Enjoy crystal-clear audio with deep bass and long battery life. Perfect for music lovers and professionals.',
            highlights: [
                'Active noise cancellation',
                '30-hour battery life',
                'Premium sound quality',
                'Comfortable ear cushions',
            ],
            details:
                'These headphones feature Bluetooth 5.0 connectivity, fast charging, and a foldable design for easy portability. Includes carrying case and audio cable.',
        },
        // Add more products as needed
    };

    return products[id] || null;
};

const reviews = { href: '#', average: 4, totalCount: 117 };

function classNames(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}

export default function ProductDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Get product data - in future, this will be an async API call
    const product = id ? getProductById(id) : null;

    if (!product) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="h-20 sm:h-24"></div>
                <div className="flex flex-col items-center justify-center py-20">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Product Not Found</h1>
                    <p className="text-gray-600 mb-8">The product you're looking for doesn't exist.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="h-20 sm:h-24"></div>

            <div className="bg-white">
                <div className="pt-6">
                    {/* Breadcrumb */}
                    <nav aria-label="Breadcrumb" className="mb-6">
                        <ol
                            role="list"
                            className="flex items-center space-x-2 px-4 sm:px-6 lg:px-8"
                        >
                            <li>
                                <div className="flex items-center">
                                    <button
                                        onClick={() => navigate('/')}
                                        className="mr-2 text-sm font-medium text-gray-900 hover:text-gray-700"
                                    >
                                        Home
                                    </button>
                                    <svg
                                        fill="currentColor"
                                        width={16}
                                        height={20}
                                        viewBox="0 0 16 20"
                                        aria-hidden="true"
                                        className="h-5 w-4 text-gray-300"
                                    >
                                        <path d="M5.697 4.34L8.98 16.532h1.327L7.025 4.341H5.697z" />
                                    </svg>
                                </div>
                            </li>
                            <li>
                                <div className="flex items-center">
                                    <span className="mr-2 text-sm font-medium text-gray-900">{product.category}</span>
                                    <svg
                                        fill="currentColor"
                                        width={16}
                                        height={20}
                                        viewBox="0 0 16 20"
                                        aria-hidden="true"
                                        className="h-5 w-4 text-gray-300"
                                    >
                                        <path d="M5.697 4.34L8.98 16.532h1.327L7.025 4.341H5.697z" />
                                    </svg>
                                </div>
                            </li>
                            <li className="text-sm">
                                <span className="font-medium text-gray-500">{product.name}</span>
                            </li>
                        </ol>
                    </nav>

                    {/* Image gallery */}
                    <div className="mt-6 px-4 sm:px-6 lg:grid lg:grid-cols-3 lg:gap-8 lg:px-8">
                        <img
                            alt={product.images[0].alt}
                            src={product.images[0].src}
                            className="row-span-2 aspect-3/4 size-full rounded-lg object-cover max-lg:hidden"
                        />
                        <img
                            alt={product.images[1].alt}
                            src={product.images[1].src}
                            className="col-start-2 aspect-3/2 size-full rounded-lg object-cover max-lg:hidden"
                        />
                        <img
                            alt={product.images[2].alt}
                            src={product.images[2].src}
                            className="col-start-2 row-start-2 aspect-3/2 size-full rounded-lg object-cover max-lg:hidden"
                        />
                        <img
                            alt={product.images[3].alt}
                            src={product.images[3].src}
                            className="row-span-2 aspect-4/5 size-full object-cover sm:rounded-lg lg:aspect-3/4"
                        />
                    </div>

                    {/* Product info */}
                    <div className="px-4 pt-10 pb-16 sm:px-6 lg:grid lg:grid-cols-3 lg:grid-rows-[auto_auto_1fr] lg:gap-x-8 lg:px-8 lg:pt-16 lg:pb-24">
                        <div className="lg:col-span-2 lg:border-r lg:border-gray-200 lg:pr-8">
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                                {product.name}
                            </h1>
                        </div>

                        {/* Options */}
                        <div className="mt-4 lg:row-span-3 lg:mt-0">
                            <h2 className="sr-only">Product information</h2>
                            <p className="text-3xl tracking-tight text-gray-900">${product.price}</p>

                            {/* Reviews */}
                            <div className="mt-6">
                                <h3 className="sr-only">Reviews</h3>
                                <div className="flex items-center">
                                    <div className="flex items-center">
                                        {[0, 1, 2, 3, 4].map((rating) => (
                                            <StarIcon
                                                key={rating}
                                                aria-hidden="true"
                                                className={classNames(
                                                    reviews.average > rating ? 'text-gray-900' : 'text-gray-200',
                                                    'size-5 shrink-0'
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <p className="sr-only">{reviews.average} out of 5 stars</p>
                                    <a
                                        href={reviews.href}
                                        className="ml-3 text-sm font-medium text-orange-600 hover:text-orange-500"
                                    >
                                        {reviews.totalCount} reviews
                                    </a>
                                </div>
                            </div>

                            <form className="mt-10">
                                {/* Colors */}
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900">Color</h3>

                                    <fieldset aria-label="Choose a color" className="mt-4">
                                        <div className="flex items-center gap-x-3">
                                            {product.colors.map((color: any) => (
                                                <div
                                                    key={color.id}
                                                    className="flex rounded-full outline -outline-offset-1 outline-black/10"
                                                >
                                                    <input
                                                        defaultValue={color.id}
                                                        defaultChecked={color === product.colors[0]}
                                                        name="color"
                                                        type="radio"
                                                        aria-label={color.name}
                                                        className={classNames(
                                                            color.classes,
                                                            'size-8 appearance-none rounded-full forced-color-adjust-none checked:outline-2 checked:outline-offset-2 focus-visible:outline-3 focus-visible:outline-offset-3'
                                                        )}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </fieldset>
                                </div>

                                {/* Sizes */}
                                <div className="mt-10">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-medium text-gray-900">Size</h3>
                                        <a href="#" className="text-sm font-medium text-orange-600 hover:text-orange-500">
                                            Size guide
                                        </a>
                                    </div>

                                    <fieldset aria-label="Choose a size" className="mt-4">
                                        <div className="grid grid-cols-4 gap-3">
                                            {product.sizes.map((size: any) => (
                                                <label
                                                    key={size.name}
                                                    aria-label={size.name}
                                                    className="group relative flex items-center justify-center rounded-md border border-gray-300 bg-white p-3 has-checked:border-orange-600 has-checked:bg-orange-600 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-orange-600 has-disabled:border-gray-400 has-disabled:bg-gray-200 has-disabled:opacity-25"
                                                >
                                                    <input
                                                        defaultValue={size.name}
                                                        name="size"
                                                        type="radio"
                                                        disabled={!size.inStock}
                                                        className="absolute inset-0 appearance-none focus:outline-none disabled:cursor-not-allowed"
                                                    />
                                                    <span className="text-sm font-medium text-gray-900 uppercase group-has-checked:text-white">
                                                        {size.name}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>
                                </div>

                                <button
                                    type="submit"
                                    className="mt-10 flex w-full items-center justify-center rounded-md border border-transparent bg-orange-500 px-8 py-3 text-base font-medium text-white hover:bg-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-hidden transition"
                                >
                                    Add to bag
                                </button>
                            </form>
                        </div>

                        <div className="py-10 lg:col-span-2 lg:col-start-1 lg:border-r lg:border-gray-200 lg:pt-6 lg:pr-8 lg:pb-16">
                            {/* Description and details */}
                            <div>
                                <h3 className="sr-only">Description</h3>

                                <div className="space-y-6">
                                    <p className="text-base text-gray-900">{product.description}</p>
                                </div>
                            </div>

                            <div className="mt-10">
                                <h3 className="text-sm font-medium text-gray-900">Highlights</h3>

                                <div className="mt-4">
                                    <ul role="list" className="list-disc space-y-2 pl-4 text-sm">
                                        {product.highlights.map((highlight: string) => (
                                            <li key={highlight} className="text-gray-400">
                                                <span className="text-gray-600">{highlight}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="mt-10">
                                <h2 className="text-sm font-medium text-gray-900">Details</h2>

                                <div className="mt-4 space-y-6">
                                    <p className="text-sm text-gray-600">{product.details}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
