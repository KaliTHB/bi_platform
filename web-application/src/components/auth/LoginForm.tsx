// components/auth/LoginForm.tsx - Updated login form
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export const LoginForm: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = await login(formData.email, formData.password);
    
    if (!result.success) {
      setError(result.error || 'Login failed');
    }
    // Success case is handled automatically by the login function (redirect)
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="auth-form-light text-left py-5 px-4 px-sm-5">
      <div className="brand-logo">
        <img src="/assets/images/logo.svg" alt="logo" />
      </div>
      <h4>Hello! let's get started</h4>
      <h6 className="font-weight-light">Sign in to continue.</h6>
      
      <form className="pt-3" onSubmit={handleSubmit}>
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        
        <div className="form-group">
          <input
            type="email"
            name="email"
            className="form-control form-control-lg"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>
        
        <div className="form-group">
          <input
            type="password"
            name="password"
            className="form-control form-control-lg"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>
        
        <div className="mt-3">
          <button
            type="submit"
            className="btn btn-block btn-primary btn-lg font-weight-medium auth-form-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm mr-2" />
                SIGNING IN...
              </>
            ) : (
              'SIGN IN'
            )}
          </button>
        </div>
        
        <div className="my-2 d-flex justify-content-between align-items-center">
          <div className="form-check">
            <label className="form-check-label text-muted">
              <input type="checkbox" className="form-check-input" />
              Keep me signed in
            </label>
          </div>
          <a href="#" className="auth-link text-black">Forgot password?</a>
        </div>
        
        <div className="text-center mt-4 font-weight-light">
          Don't have an account? <a href="/register" className="text-primary">Create</a>
        </div>
      </form>
    </div>
  );
};