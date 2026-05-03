import { useState } from 'react';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';

type UserRole = 'admin' | 'operator' | 'viewer' | 'researcher';

interface LoginProps {
  onLogin: (user: { user_id: string; username: string; email: string; full_name: string; role: UserRole; is_active: boolean }) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username.trim() || !password) {
      setError('Please enter both username and password');
      setLoading(false);
      return;
    }

    try {
      // Check if Supabase is configured
      if (!supabase) {
        setError('Database not configured. Please try again later.');
        setLoading(false);
        return;
      }
      
      // Use RPC function to bypass RLS
      const { data: users, error: userError } = await supabase
        .rpc('authenticate_user', { p_login: username });

      if (userError) {
        setError('Authentication failed. Please try again.');
        setLoading(false);
        return;
      }

      if (!users || users.length === 0) {
        setError('User not found');
        setLoading(false);
        return;
      }

      const user = users[0];

      if (!user.is_active) {
        setError('Account is inactive. Please contact administrator.');
        setLoading(false);
        return;
      }

      // Verify password - handle both bcrypt hashes and plaintext
      let isValidPassword = false;
      if (user.password_hash.startsWith('$2')) {
        // Bcrypt hash
        isValidPassword = await bcrypt.compare(password, user.password_hash);
      } else {
        // Plaintext comparison (for development/testing)
        isValidPassword = password === user.password_hash;
      }
      if (!isValidPassword) {
        setError('Invalid password');
        setLoading(false);
        return;
      }

      // Login successful
      onLogin({
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role as UserRole,
        is_active: true
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('Failed to fetch')) {
        setError('Cannot connect to database. Check your internet connection or verify Supabase is running.');
      } else {
        setError('An error occurred during login: ' + errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap');
        
        .av-login {
          font-family: 'DM Sans', sans-serif;
          background: linear-gradient(135deg, #0a1f42 0%, #0F2854 50%, #1C4D8D 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
        }
        
        .av-login::before {
          content: '';
          position: absolute;
          inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234988C4' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          pointer-events: none;
        }
        
        .login-glass-card {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(189, 232, 245, 0.15);
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          width: 100%;
          max-width: 420px;
          position: relative;
          z-index: 1;
        }
        
        .login-header {
          background: linear-gradient(135deg, rgba(15, 40, 84, 0.8), rgba(28, 77, 141, 0.6));
          padding: 40px 30px;
          text-align: center;
          border-bottom: 1px solid rgba(189, 232, 245, 0.1);
        }
        
        .logo-img {
          width: 80px;
          height: 80px;
          margin-bottom: 16px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid rgba(189, 232, 245, 0.3);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        
        .logo {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 8px;
        }
        
        .logo-sub {
          color: #BDE8F5;
          font-size: 14px;
        }
        
        .login-body {
          padding: 40px 30px;
        }
        
        .form-group {
          margin-bottom: 24px;
        }
        
        .form-label {
          display: block;
          font-weight: 500;
          color: #BDE8F5;
          margin-bottom: 8px;
          font-size: 14px;
        }
        
        .form-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(189, 232, 245, 0.3);
          border-radius: 8px;
          font-size: 14px;
          color: #ffffff;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        
        .form-input::placeholder {
          color: rgba(189, 232, 245, 0.5);
        }
        
        .form-input:focus {
          outline: none;
          border-color: #4988C4;
          background: rgba(255, 255, 255, 0.1);
        }
        
        .btn {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #1C4D8D, #4988C4);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #0F2854, #1C4D8D);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(73, 136, 196, 0.3);
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
        }
        
        .alert-error {
          background: rgba(220, 38, 38, 0.15);
          color: #fca5a5;
          border: 1px solid rgba(220, 38, 38, 0.3);
        }
        
      `}</style>

      <div className="av-login">
        <div className="login-glass-card">
          <div className="login-header">
            <img src="/logo.png" alt="Aqua-Vision Logo" className="logo-img" />
            <div className="logo">Aqua-Vision</div>
            <div className="logo-sub">River Water Quality Monitoring</div>
          </div>

          <div className="login-body">
            {error && (
              <div className="alert alert-error">{error}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="username">Username or Email</label>
                <input
                  type="text"
                  id="username"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username or email"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>

              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
