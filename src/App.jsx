// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './components/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminDashboard from './components/admin/AdminDashboard';
import AuctioneerDashboard from './components/auctioneer/AuctioneerDashboard';
import TeamDashboard from './components/team/TeamDashboard';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { Home } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Unauthorized page component
const UnauthorizedPage = () => {
  const navigate = useNavigate();
  
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={10} sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h3" gutterBottom color="error.main">
            ⛔ Unauthorized
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            You don't have permission to access this page.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Home />}
            onClick={() => navigate('/login')}
            sx={{ mt: 2 }}
          >
            Go to Login
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          
          {/* Protected Routes - Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          
          {/* Protected Routes - Auctioneer */}
          <Route
            path="/auctioneer"
            element={
              <ProtectedRoute allowedRoles={['auctioneer']}>
                <AuctioneerDashboard />
              </ProtectedRoute>
            }
          />
          
          {/* Protected Routes - Team */}
          <Route
            path="/team"
            element={
              <ProtectedRoute allowedRoles={['team']}>
                <TeamDashboard />
              </ProtectedRoute>
            }
          />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;