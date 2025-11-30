// src/components/auth/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Sports, Login as LoginIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        // Redirect based on role
        const role = result.user.role;
        if (role === 'admin') {
          navigate('/admin');
        } else if (role === 'auctioneer') {
          navigate('/auctioneer');
        } else if (role === 'team') {
          navigate('/team');
        }
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={10}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 2,
          }}
        >
          <Stack spacing={3}>
            {/* Header */}
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" flexWrap="wrap">
              <Sports sx={{ fontSize: { xs: 40, sm: 48 }, color: 'primary.main' }} />
              <Typography 
                variant="h4" 
                component="h1" 
                color="primary.main" 
                fontWeight="700"
                sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
              >
                TMH MOCK AUCTION
              </Typography>
            </Stack>

            <Typography variant="h6" textAlign="center" color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Sign in to continue
            </Typography>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  variant="outlined"
                  placeholder="Enter your email"
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  variant="outlined"
                  placeholder="Enter your password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleTogglePasswordVisibility}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
                  sx={{
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </Stack>
            </form>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;