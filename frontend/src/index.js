import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeProvider';
import { MonthProvider } from './MonthContext';
import { Toaster } from 'sonner';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <MonthProvider>
          <App />
          <Toaster position="top-center" richColors />
        </MonthProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);