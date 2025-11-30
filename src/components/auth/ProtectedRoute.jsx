// src/components/auth/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Box, CircularProgress, Container } from '@mui/material';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser, loading } = useAuth();

  // Show loading while checking auth status
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.100',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Not logged in - redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Check if user role is allowed
  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // User is authenticated and authorized
  return children;
};

export default ProtectedRoute;