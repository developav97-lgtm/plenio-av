import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import './App.css';
import { useAuth } from './AuthContext';
import { AuthForm } from './components/AuthForm';
import { Dashboard } from './components/Dashboard';
import { PaymentMethods } from './components/PaymentMethods';
import { Categories } from './components/Categories';
import { Transactions } from './components/Transactions';
import { Budgets } from './components/Budgets';
import { QuickAddTransaction } from './components/QuickAddTransaction';
import { setAuthToken } from './api';
import { Button } from './components/ui/button';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { toast } from 'sonner';
import { LayoutDashboard, Wallet, Tag, Receipt, Target, Plus, LogOut } from 'lucide-react';

function App() {
  const { user, loading, token } = useAuth();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, [token]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Sesión cerrada');
    } catch (error) {
      toast.error('Error al cerrar sesión');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="App">
        <AuthForm />
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 z-50 transition-colors">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Space Grotesk' }}>Plenio AV</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="logout-btn" className="text-gray-700 dark:text-gray-300">
              Cerrar <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <div className="pt-16">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/payment-methods" element={<PaymentMethods />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* Quick Add Button */}
        <button
          className="quick-add-btn"
          onClick={() => setQuickAddOpen(true)}
          data-testid="quick-add-btn"
        >
          <Plus />
        </button>

        <QuickAddTransaction
          open={quickAddOpen}
          onClose={() => setQuickAddOpen(false)}
          onSuccess={() => window.location.reload()}
        />

        {/* Bottom Navigation */}
        <nav className="bottom-nav">
          <div className="bottom-nav-content">
            <NavLink
              to="/"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              data-testid="nav-dashboard"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Inicio</span>
            </NavLink>
            <NavLink
              to="/payment-methods"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              data-testid="nav-payment-methods"
            >
              <Wallet className="w-5 h-5" />
              <span>Medios</span>
            </NavLink>
            <NavLink
              to="/categories"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              data-testid="nav-categories"
            >
              <Tag className="w-5 h-5" />
              <span>Categorías</span>
            </NavLink>
            <NavLink
              to="/transactions"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              data-testid="nav-transactions"
            >
              <Receipt className="w-5 h-5" />
              <span>Movimientos</span>
            </NavLink>
            <NavLink
              to="/budgets"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              data-testid="nav-budgets"
            >
              <Target className="w-5 h-5" />
              <span>Presupuestos</span>
            </NavLink>
          </div>
        </nav>
      </BrowserRouter>
    </div>
  );
}

export default App;