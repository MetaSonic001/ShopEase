import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, ArrowLeft, Sparkles, Shield, Zap, Check, BarChart3, TrendingUp, Users } from 'lucide-react';

// Main App Component with routing logic
const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<'signup' | 'login'>('signup');

    return (
        <div className="fixed inset-0 w-full h-full overflow-auto bg-gray-50">
            <div className="min-h-full flex flex-col lg:flex-row">
                {currentView === 'signup' ? (
                    <SignupPage onNavigateToLogin={() => setCurrentView('login')} />
                ) : (
                    <LoginPage onNavigateToSignup={() => setCurrentView('signup')} />
                )}
            </div>
        </div>
    );
};

// Signup Page Component
interface SignupPageProps {
    onNavigateToLogin: () => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ onNavigateToLogin }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        company: '',
        password: '',
        confirmPassword: '',
        agreeToTerms: false
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const navigate = useNavigate();
    const auth = useAuth();

    // Connect to backend - POST /api/auth/register
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.agreeToTerms) {
            alert('Please agree to the Terms of Service and Privacy Policy');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        /* 
        // Backend Integration Example:
        try {
          const response = await fetch('http://localhost:5000/api/auth/signup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              company: formData.company,
              password: formData.password
            }),
          });
          
          const data = await response.json();
          
          if (response.ok) {
            // Store token in localStorage
            localStorage.setItem('token', data.token);
            // Redirect to dashboard
            window.location.href = '/dashboard';
          } else {
            alert(data.message || 'Signup failed');
          }
        } catch (error) {
          console.error('Signup error:', error);
          alert('An error occurred during signup');
        }
        */

        try {
            const created = await auth.register(
                `${formData.firstName} ${formData.lastName}`,
                formData.email,
                formData.password
            );
            if (created && (created as any).role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (err: any) {
            console.error('Signup error', err);
            alert(err?.response?.data?.message || 'Signup failed');
        }
    };

    const handleDemoClick = () => {
        // TODO: Connect to backend - Demo account creation
        console.log('Demo access requested');
        alert('Demo functionality - Connect to backend');
    };

    return (
        <>
            {/* Left Panel - Hidden on mobile */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sky-600 to-indigo-700 text-white p-12 flex-col">
                <button className="flex items-center gap-2 text-white/90 mb-12 hover:opacity-90 transition-opacity">
                    <ArrowLeft size={20} />
                    <span className="text-base">Back to Home</span>
                </button>

                <div className="flex items-center gap-3 mb-12">
                    <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
                        <Shield className="text-white" size={26} />
                    </div>
                    <h1 className="text-2xl font-bold">ShopEase</h1>
                </div>

                <h2 className="text-4xl font-extrabold mb-4 leading-tight">
                    Grow your store with confidence
                </h2>

                <p className="text-lg mb-8 text-white/90 leading-relaxed">
                    Actionable analytics and a simple storefront to connect customers with the products they love.
                </p>

                <div className="space-y-4 mb-12">
                    {[
                        'Customer journey tracking',
                        'Cart abandonment analytics',
                        'Product page heatmaps',
                        'Conversion funnel insights'
                    ].map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                <Check size={16} className="text-white" strokeWidth={3} />
                            </div>
                            <span className="text-base text-white">{item}</span>
                        </div>
                    ))}
                </div>


            </div>

            {/* Right Panel - Signup Form */}
            <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-6 md:p-12">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-lg flex items-center justify-center">
                            <Shield className="text-white" size={22} />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">ShopEase</h1>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Create your account</h2>
                        <p className="text-sm md:text-base text-gray-600 mb-6 md:mb-8">Start selling and using analytics to grow your business.</p>

                        <div className="space-y-4 md:space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="John"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        className="w-full px-4 py-3 text-base rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Doe"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        className="w-full px-4 py-3 text-base rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Work Email
                                </label>
                                <input
                                    type="email"
                                    placeholder="john@yourstore.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 text-base rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Store Name/Website
                                </label>
                                <input
                                    type="text"
                                    placeholder="yourstore.com"
                                    value={formData.company}
                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                    className="w-full px-4 py-3 text-base rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Create a strong password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-3 text-base rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Confirm your password"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        className="w-full px-4 py-3 text-base rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-start gap-2">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={formData.agreeToTerms}
                                    onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 shrink-0"
                                />
                                <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400">
                                    I agree to the{' '}
                                    <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Terms of Service</a>
                                    {' '}and{' '}
                                    <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</a>
                                </label>
                            </div>

                            <button
                                onClick={handleSignup}
                                className="w-full bg-gradient-to-r from-orange-400 to-pink-500 text-black py-3 text-base rounded-lg font-semibold hover:from-orange-500 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                                Create account
                            </button>

                            <div className="text-center text-gray-500 dark:text-gray-400 text-sm">OR</div>

                            <button
                                type="button"
                                onClick={handleDemoClick}
                                className="w-full border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 text-base rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Sparkles size={20} />
                                Try Demo Store
                            </button>

                            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    onClick={onNavigateToLogin}
                                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                                >
                                    Sign in
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

// Login Page Component
interface LoginPageProps {
    onNavigateToSignup: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onNavigateToSignup }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();
    const auth = useAuth();

    // Connect to backend - POST /api/auth/login
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const logged = await auth.login(formData.email, formData.password);
            if (logged && (logged as any).role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (err: any) {
            console.error('Login error', err);
            alert(err?.response?.data?.message || 'Login failed');
        }
    };

    const handleDemoAccess = () => {
        // TODO: Connect to backend - Demo access
        console.log('Demo access requested');
        alert('Demo access functionality - Connect to backend');
    };

    const handleForgotPassword = () => {
        // TODO: Connect to backend - Password reset flow
        console.log('Forgot password clicked');
        alert('Password reset functionality - Connect to backend');
    };

    return (
        <>
            {/* Left Panel - Hidden on mobile */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sky-600 to-indigo-700 text-white p-12 flex-col">
                <button className="flex items-center gap-2 text-black mb-12 hover:opacity-80 transition-opacity">
                    <ArrowLeft size={20} />
                    <span className="text-base">Back to Home</span>
                </button>

                <div className="flex items-center gap-3 mb-12">
                    <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
                        <Shield className="text-white" size={26} />
                    </div>
                    <h1 className="text-2xl font-bold">ShopEase</h1>
                </div>

                <h2 className="text-5xl font-bold mb-6 leading-tight">
                    Welcome Back to Your Store
                </h2>

                <p className="text-xl mb-12 text-blue-50 leading-relaxed">
                    Access your e-commerce dashboard and continue optimizing your online store performance.
                </p>

                <div className="space-y-6 mb-12">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-black bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
                            <BarChart3 className="text-white" size={28} strokeWidth={2} />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold mb-2 text-white">Sales analytics</h3>
                            <p className="text-base text-blue-50">Track revenue and product performance in real-time</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-black bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
                            <TrendingUp className="text-white" size={28} strokeWidth={2} />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold mb-2 text-white">Conversion optimization</h3>
                            <p className="text-base text-blue-50">Improve checkout flow and funnel metrics</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-black bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
                            <Users className="text-white" size={28} strokeWidth={2} />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold mb-2 text-white">Customer insights</h3>
                            <p className="text-base text-blue-50">Understand shopping patterns and preferences</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-6 md:p-12">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-lg flex items-center justify-center">
                            <Shield className="text-white" size={22} />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">ShopEase</h1>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
                        <p className="text-sm md:text-base text-gray-600 mb-6 md:mb-8">Sign in to your ShopEase account</p>

                        <div className="space-y-4 md:space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 text-base rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-3 text-base rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleLogin}
                                className="w-full bg-gradient-to-r from-orange-400 to-pink-500 text-white py-3 text-base rounded-lg font-semibold hover:from-orange-500 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                                Sign in
                            </button>

                            <div className="text-center text-gray-500 dark:text-gray-400 text-sm">OR</div>

                            <button
                                type="button"
                                onClick={handleDemoAccess}
                                className="w-full border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 text-base rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Sparkles size={20} />
                                Try Demo Store
                            </button>

                            <div className="space-y-3 text-center text-sm">
                                <p className="text-gray-600 dark:text-gray-400">
                                    Don't have an account?{' '}
                                    <button
                                        type="button"
                                        onClick={onNavigateToSignup}
                                        className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                                    >
                                        Sign up
                                    </button>
                                </p>

                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 transition-colors"
                                >
                                    Forgot your password?
                                </button>
                            </div>

                            <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-4">
                                By signing in, you agree to our Terms of Service and Privacy Policy
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default App;