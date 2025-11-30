// src/components/admin/UserManagement.jsx
import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Stack,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  LockReset,
  CheckCircle,
  Cancel,
  Refresh,
} from '@mui/icons-material';
import { supabase } from '../../services/supabaseClient';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch all users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('role', { ascending: true })
        .order('team_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setErrorMessage('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Open reset password dialog
  const handleOpenResetPassword = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setOpenDialog(true);
    setSuccessMessage('');
    setErrorMessage('');
  };

  // Close dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    setNewPassword('');
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    try {
      // Update password using crypt function
      const { error } = await supabase.rpc('reset_user_password', {
        user_id: selectedUser.id,
        new_password: newPassword,
      });

      if (error) throw error;

      setSuccessMessage(`Password reset successfully for ${selectedUser.email}`);
      handleCloseDialog();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error resetting password:', error);
      setErrorMessage('Failed to reset password. Check console for details.');
    }
  };

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'primary';
      case 'auctioneer':
        return 'secondary';
      case 'team':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="600">
          User Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchUsers}
        >
          Refresh
        </Button>
      </Stack>

      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage('')} sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" onClose={() => setErrorMessage('')} sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Email</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Role</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Team</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography>Loading users...</Typography>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography>No users found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={user.role.toUpperCase()}
                      color={getRoleBadgeColor(user.role)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {user.team_name || '-'}
                  </TableCell>
                  <TableCell>
                    {user.is_logged_in ? (
                      <Chip
                        icon={<CheckCircle />}
                        label="Online"
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Chip
                        icon={<Cancel />}
                        label="Offline"
                        color="default"
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Reset Password">
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => handleOpenResetPassword(user)}
                      >
                        <LockReset />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Reset Password Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Reset Password for {selectedUser?.email}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Enter a new password for this user (minimum 6 characters)
            </Typography>
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              autoFocus
            />
            {errorMessage && (
              <Alert severity="error">{errorMessage}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleResetPassword}
            variant="contained"
            disabled={!newPassword || newPassword.length < 6}
          >
            Reset Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;