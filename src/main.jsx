// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import './index.css';

// Create Material UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#2196f3', // Blue for primary actions
      light: '#64b5f6',
      dark: '#1976d2',
    },
    secondary: {
      main: '#9c27b0', // Purple for secondary
      light: '#ba68c8',
      dark: '#7b1fa2',
    },
    success: {
      main: '#4caf50', // Green for success
      light: '#81c784',
      dark: '#388e3c',
    },
    warning: {
      main: '#ff9800', // Orange for bids/warnings
      light: '#ffb74d',
      dark: '#f57c00',
    },
    error: {
      main: '#f44336',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Don't uppercase button text
          fontWeight: 600,
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);