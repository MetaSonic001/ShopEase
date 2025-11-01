import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

type AuthMode = 'signin' | 'signup';

const AnimatedSignIn: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');

  // Animation states
  const [formVisible, setFormVisible] = useState(false);

  const navigate = useNavigate();
  const auth = useAuth();

  // Sign In Form State
  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
  });

  // Sign Up Form State
  const [signUpData, setSignUpData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });

  useEffect(() => {
    setMounted(true);
    setTimeout(() => setFormVisible(true), 300);
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const logged = await auth.login(signInData.email, signInData.password);
      if (logged && (logged as { role?: string }).role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Login error', err);
      const error = err as { response?: { data?: { message?: string } } };
      alert(error?.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!signUpData.agreeToTerms) {
      alert('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (signUpData.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const created = await auth.register(
        `${signUpData.firstName} ${signUpData.lastName}`,
        signUpData.email,
        signUpData.password
      );
      if (created && (created as { role?: string }).role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Signup error', err);
      const error = err as { response?: { data?: { message?: string } } };
      alert(error?.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Only show the component once mounted to avoid hydration issues
  if (!mounted) return null;

  return (
    <div className="min-h-screen w-full transition-colors duration-300 bg-gray-50">
      <div className="flex min-h-screen items-center justify-center p-4 md:p-0">
        <div className="w-full max-w-6xl overflow-hidden rounded-2xl transition-all duration-500 bg-white shadow-xl shadow-gray-200 ${formVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}">

          <div className="flex flex-col md:flex-row">
            {/* Left side - E-commerce Images Collage */}
            <div className="hidden md:block w-full md:w-3/5 bg-gradient-to-br from-orange-50 to-pink-50 p-8 animate-fade-in">
              <div className="grid grid-cols-2 grid-rows-3 gap-4 h-full overflow-hidden">
                {/* Top left - Shopping */}
                <div className="overflow-hidden rounded-xl shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&auto=format&fit=crop"
                    alt="Shopping"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Top right - Orange stat */}
                <div
                  className="rounded-xl flex flex-col justify-center items-center p-6 text-white bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg"
                  style={{
                    transform: formVisible ? 'translateY(0)' : 'translateY(20px)',
                    opacity: formVisible ? 1 : 0,
                    transition: 'transform 0.6s ease-out, opacity 0.6s ease-out',
                    transitionDelay: '0.2s',
                  }}
                >
                  <h2 className="text-5xl font-bold mb-2">10K+</h2>
                  <p className="text-center text-sm">Happy customers shopping with us worldwide</p>
                </div>

                {/* Middle left - Products */}
                <div className="overflow-hidden rounded-xl shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop"
                    alt="Products"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Middle right - Fashion */}
                <div className="overflow-hidden rounded-xl shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&auto=format&fit=crop"
                    alt="Fashion shopping"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Bottom left - Pink stat */}
                <div
                  className="rounded-xl flex flex-col justify-center items-center p-6 text-white bg-gradient-to-br from-pink-500 to-pink-600 shadow-lg"
                  style={{
                    transform: formVisible ? 'translateY(0)' : 'translateY(20px)',
                    opacity: formVisible ? 1 : 0,
                    transition: 'transform 0.6s ease-out, opacity 0.6s ease-out',
                    transitionDelay: '0.4s',
                  }}
                >
                  <h2 className="text-5xl font-bold mb-2">500+</h2>
                  <p className="text-center text-sm">Premium products across multiple categories</p>
                </div>

                {/* Bottom right - Online Shopping */}
                <div className="overflow-hidden rounded-xl shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&auto=format&fit=crop"
                    alt="Online shopping"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>
            </div>

            {/* Right side - Sign in form */}
            <div
              className="w-full md:w-2/5 p-6 sm:p-8 md:p-12 bg-white text-gray-900"
              style={{
                transform: formVisible ? 'translateX(0)' : 'translateX(20px)',
                opacity: formVisible ? 1 : 0,
                transition: 'transform 0.6s ease-out, opacity 0.6s ease-out'
              }}
            >
              <div className="flex justify-end mb-6">
                <p className="text-sm text-gray-600">
                  {authMode === 'signin' ? "Don't have an account?" : "Already have an account?"}{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                    className="ml-1 font-medium text-orange-600 hover:text-orange-700"
                  >
                    {authMode === 'signin' ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </div>

              <div className="mb-8">
                <h1 className="text-2xl font-bold mb-1 text-gray-900">
                  {authMode === 'signin' ? 'Sign in to' : 'Sign up for'} <span className="text-orange-500">ShopEase</span>
                </h1>
                <p className="text-sm text-gray-600">
                  {authMode === 'signin'
                    ? 'Welcome back! Please enter your login details below.'
                    : 'Create your account and start shopping today.'}
                </p>
              </div>

              <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp} className="space-y-5">{authMode === 'signup' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      id="firstName"
                      value={signUpData.firstName}
                      onChange={(e) => setSignUpData({ ...signUpData, firstName: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white text-gray-900 placeholder:text-gray-400"
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      id="lastName"
                      value={signUpData.lastName}
                      onChange={(e) => setSignUpData({ ...signUpData, lastName: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white text-gray-900 placeholder:text-gray-400"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>
              )}

                <div className="space-y-1">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email Address
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={authMode === 'signin' ? signInData.email : signUpData.email}
                      onChange={(e) => authMode === 'signin'
                        ? setSignInData({ ...signInData, email: e.target.value })
                        : setSignUpData({ ...signUpData, email: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 py-3 px-4 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white text-gray-900 placeholder:text-gray-400"
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      id="password"
                      value={authMode === 'signin' ? signInData.password : signUpData.password}
                      onChange={(e) => authMode === 'signin'
                        ? setSignInData({ ...signInData, password: e.target.value })
                        : setSignUpData({ ...signUpData, password: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 py-3 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white text-gray-900 placeholder:text-gray-400"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff size={18} className="hover:text-gray-700 transition-colors" />
                      ) : (
                        <Eye size={18} className="hover:text-gray-700 transition-colors" />
                      )}
                    </button>
                  </div>
                </div>

                {authMode === 'signup' && (
                  <div className="space-y-1">
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Confirm Password
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        id="confirmPassword"
                        value={signUpData.confirmPassword}
                        onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                        className="block w-full rounded-md border border-gray-300 py-3 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white text-gray-900 placeholder:text-gray-400"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={18} className="hover:text-gray-700 transition-colors" />
                        ) : (
                          <Eye size={18} className="hover:text-gray-700 transition-colors" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {authMode === 'signup' && (
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={signUpData.agreeToTerms}
                      onChange={(e) => setSignUpData({ ...signUpData, agreeToTerms: e.target.checked })}
                      className="w-4 h-4 mt-1 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      required
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      I agree to the{' '}
                      <a href="#" className="font-medium text-orange-600 hover:text-orange-700">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="#" className="font-medium text-orange-600 hover:text-orange-700">
                        Privacy Policy
                      </a>
                    </span>
                  </label>
                )}

                {authMode === 'signin' && (
                  <div className="flex justify-end">
                    <a
                      href="#"
                      className="text-sm font-medium text-orange-600 hover:text-orange-700"
                    >
                      Forgot the password?
                    </a>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full justify-center rounded-md py-3 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-300 bg-orange-600 hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      {authMode === 'signin' ? 'Signing in...' : 'Creating account...'}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      {authMode === 'signin' ? 'Login' : 'Create Account'}
                    </span>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { AnimatedSignIn };
