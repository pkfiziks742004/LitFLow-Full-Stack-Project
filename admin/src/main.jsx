import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import App from './App';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { BrandingProvider } from './context/BrandingContext';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AdminAuthProvider>
      <BrandingProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#111c32',
              color: '#e2e8f0',
              border: '1px solid rgba(148, 163, 184, 0.2)'
            }
          }}
        />
      </BrandingProvider>
    </AdminAuthProvider>
  </BrowserRouter>
);
