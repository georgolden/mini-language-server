import React, { useEffect, useState } from 'react';
import { Heart, Sparkles, EyeOff, Eye, Github } from 'lucide-react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useAuth } from '@hooks/apollo/auth';

const OAuthButton = ({ icon: Icon, label, onClick, className }) => (
  <button
    onClick={onClick}
    type="button"
    className={`w-full flex items-center justify-center gap-2 py-2 px-4 
              rounded-full font-medium border-2 transition-all duration-200
              hover:scale-105 ${className}`}
  >
    <Icon size={20} />
    <span>{label}</span>
  </button>
);

const AuthInput = ({ type = 'text', icon: Icon, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="relative">
      <input
        type={inputType}
        className="w-full px-4 py-2 rounded-full border-2 border-pink-200 
                 focus:border-pink-400 dark:border-pink-800 dark:focus:border-pink-600
                 bg-white/50 dark:bg-gray-800/50 outline-none"
        {...props}
      />
      {type === 'password' && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-pink-500"
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      )}
    </div>
  );
};

const AuthLayout = ({ children, title, subtitle }) => (
  <div className="h-full flex items-center justify-center bg-gradient-to-r from-pink-100/80 to-purple-100/80 dark:from-pink-950/50 dark:to-purple-950/50">
    <div className="w-full max-w-md p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-lg">
      <div className="text-center space-y-4 mb-8">
        <div className="flex justify-center">
          <Heart className="w-12 h-12 text-pink-400 dark:text-pink-300 animate-pulse" />
        </div>
        <h2 className="text-2xl font-semibold text-pink-600 dark:text-pink-300">{title}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
      </div>
      {children}
    </div>
  </div>
);

const GithubAuthButton = ({ label, className }) => {
  const handleGithubLogin = () => {
    const GITHUB_CLIENT_ID = 'Ov23lidv0TgnriCqQUaB';
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/github/callback');
    const state = crypto.randomUUID();

    // Store state for CSRF protection
    sessionStorage.setItem('github_oauth_state', state);

    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&state=${state}&scope=user:email`;

    window.location.href = githubUrl;
  };

  return (
    <OAuthButton icon={Github} label={label} onClick={handleGithubLogin} className={className} />
  );
};

export const GithubCallback = () => {
  const navigate = useNavigate();
  const { signInWithGithub } = useAuth();
  const search = useSearch({ from: '/auth/github/callback' });
  const [error, setError] = useState('');

  useEffect(() => {
    const handleGithubCallback = async () => {
      try {
        console.log(search);
        const code = search?.code;
        const returnedState = search?.state;
        const savedState = sessionStorage.getItem('github_oauth_state');

        if (!code) {
          throw new Error('No authorization code received');
        }

        if (returnedState !== savedState) {
          throw new Error('Invalid state parameter');
        }

        // Clean up state
        sessionStorage.removeItem('github_oauth_state');

        // Send code to backend
        await signInWithGithub(code);
        navigate({ to: '/' });
      } catch (error) {
        console.error('GitHub auth failed:', error);
        setError(error.message || 'Authentication failed (｡•́︿•̀｡)');
        setTimeout(() => navigate({ to: '/login' }), 3000);
      }
    };

    handleGithubCallback();
  }, [search, signInWithGithub, navigate]);

  if (error) {
    return (
      <AuthLayout title="Oops! (｡•́︿•̀｡)" subtitle={error}>
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Redirecting you back to login...</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Authenticating... (◠‿◠✿)" subtitle="Just a moment while we log you in~">
      <div className="flex justify-center">
        <Sparkles className="w-12 h-12 text-pink-400 animate-spin" />
      </div>
    </AuthLayout>
  );
};

export const KawaiiLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(formData.email, formData.password);
      navigate({ to: '/' }); // Navigate to home after successful login
    } catch (error) {
      // You might want to add error handling here
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome Back (｡♥‿♥｡)" subtitle="Login to continue your kawaii journey~">
      <div className="space-y-4">
        <div className="space-y-4">
          <GithubAuthButton
            label="Continue with Github"
            className="bg-gray-800 text-white hover:bg-gray-900 dark:bg-gray-700"
          />
        </div>
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-300 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">
            Or continue with email ♡
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          type="email"
          placeholder="Email-chan~"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <AuthInput
          type="password"
          placeholder="Password-kun~"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 rounded-full font-medium
                   bg-gradient-to-r from-pink-400 to-purple-400 
                   hover:from-pink-500 hover:to-purple-500
                   dark:from-pink-600 dark:to-purple-600
                   dark:hover:from-pink-700 dark:hover:to-purple-700
                   text-white transform hover:scale-105 transition-all duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Sparkles className="w-5 h-5 animate-spin mx-auto" /> : 'Login ♡'}
        </button>
      </form>

      <div className="mt-6 text-center space-y-2">
        <Link to="/signup" className="text-pink-500 hover:text-pink-600 dark:hover:text-pink-400">
          Need an account? Sign up here! (◕‿◕✿)
        </Link>
        <div>
          <a href="#" className="text-pink-500 hover:text-pink-600 dark:hover:text-pink-400">
            Forgot password? (｡•́︿•̀｡)
          </a>
        </div>
      </div>
    </AuthLayout>
  );
};

export const KawaiiSignup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match (｡•́︿•̀｡)');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long (｡•́︿•̀｡)');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await signUp(formData.email, formData.password, formData.username);
      navigate({ to: '/' }); // Navigate to home after successful signup
    } catch (err) {
      setError(err.message || 'Something went wrong (｡•́︿•̀｡)');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Join Us! (◕‿◕✿)" subtitle="Create your kawaii account~">
      <div className="space-y-4">
        <OAuthButton
          icon={Github}
          label="Sign up with Github"
          className="bg-gray-800 text-white hover:bg-gray-900 dark:bg-gray-700"
        />
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-300 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">
            Or sign up with email ♡
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 text-sm text-red-500 bg-red-100 dark:bg-red-900/30 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          placeholder="Username-chan~"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          required
        />
        <AuthInput
          type="email"
          placeholder="Email-chan~"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <AuthInput
          type="password"
          placeholder="Password-kun~"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
        <AuthInput
          type="password"
          placeholder="Confirm Password-kun~"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          required
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 rounded-full font-medium
                   bg-gradient-to-r from-pink-400 to-purple-400 
                   hover:from-pink-500 hover:to-purple-500
                   dark:from-pink-600 dark:to-purple-600
                   dark:hover:from-pink-700 dark:hover:to-purple-700
                   text-white transform hover:scale-105 transition-all duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Sparkles className="w-5 h-5 animate-spin mx-auto" /> : 'Sign Up ♡'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link to="/login" className="text-pink-500 hover:text-pink-600 dark:hover:text-pink-400">
          Already have an account? Login here! (｡♥‿♥｡)
        </Link>
      </div>
    </AuthLayout>
  );
};
