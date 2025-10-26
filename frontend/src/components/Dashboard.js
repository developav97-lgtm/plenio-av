import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { statsAPI, categoriesAPI, paymentMethodsAPI, transactionsAPI } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, CreditCard, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { format, startOfMonth, endOfMonth, addMonths, subMonths,parseISO ,isWithinInterval} from 'date-fns';
import { es } from 'date-fns/locale';
import { useMonth } from '../MonthContext';
import { formatCurrency } from '../utils/currency';

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4'];

export const Dashboard = () => {
  const { selectedMonth, setSelectedMonth } = useMonth();
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const filterTransactionsByMonth = (transactions, month) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);

    return allTransactions.filter(t => {
      const transDate = parseISO(t.date); // asegura que sea una fecha válida
      console.log(transDate)
      return isWithinInterval(transDate, { start, end });
    });
  };

  const calculateMonthStats = (transactions) => {
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryExpenses = {};
    
    transactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
        const catId = t.categoryId;
        categoryExpenses[catId] = (categoryExpenses[catId] || 0) + t.amount;
      }
    });
    
    return {
      totalIncome,
      totalExpense,
      categoryExpenses,
    };
  };

  const fetchData = async () => {
    try {
      const [catsRes, pmsRes, transRes] = await Promise.all([
        categoriesAPI.getAll(),
        paymentMethodsAPI.getAll(),
        transactionsAPI.getAll(),
      ]);
      
      setCategories(catsRes.data);
      setPaymentMethods(pmsRes.data);
      setAllTransactions(transRes.data);
      
      // Filter transactions by selected month
      const monthTransactions = filterTransactionsByMonth(transRes.data, selectedMonth);
      const monthStats = calculateMonthStats(monthTransactions);
      
      // Calculate total balance from payment methods
      const totalBalance = pmsRes.data.reduce((sum, pm) => sum + (pm.balance || 0), 0);
      
      setStats({
        ...monthStats,
        totalBalance,
      });
      
      setRecentTransactions(monthTransactions.slice(0, 5));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setSelectedMonth(prevMonth => subMonths(prevMonth, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prevMonth => addMonths(prevMonth, 1));
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(new Date());
  };

  const getCategoryExpensesData = () => {
    if (!stats || !categories) return [];
    return Object.entries(stats.categoryExpenses || {}).map(([catId, amount]) => {
      const cat = categories.find(c => c.id === catId);
      return {
        name: cat?.name || 'Sin categoría',
        value: amount,
        icon: cat?.icon || '💰',
      };
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  return (
    <div className="page-container pb-24" data-testid="dashboard">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }} data-testid="dashboard-title">
          Panel de Control
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Resumen de tus finanzas</p>
      </div>

      {/* Month Selector */}
      <Card className="stat-card mb-6" data-testid="month-selector">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
              data-testid="prev-month-btn"
              className="dark:text-gray-300"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <Calendar className="w-5 h-5 text-green-600" />
                <span data-testid="selected-month">
                  {format(selectedMonth, "MMMM yyyy", { locale: es })}
                </span>
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={handleCurrentMonth}
                className="text-xs text-green-600 dark:text-green-400 mt-1"
                data-testid="current-month-btn"
              >
                Ir al mes actual
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              data-testid="next-month-btn"
              className="dark:text-gray-300"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="stat-card" data-testid="total-balance-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Balance Total</CardTitle>
            <Wallet className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="total-balance">
              {formatCurrency(stats?.totalBalance || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="total-income-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ingresos</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="total-income">
              {formatCurrency(stats?.totalIncome || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="total-expense-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Gastos</CardTitle>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="total-expense">
              {formatCurrency(stats?.totalExpense || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="stat-card" data-testid="expenses-by-category-chart">
          <CardHeader>
            <CardTitle>Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {getCategoryExpensesData().length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={getCategoryExpensesData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getCategoryExpensesData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                No hay datos de gastos
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="stat-card" data-testid="payment-methods-chart">
          <CardHeader>
            <CardTitle>Balance por Medio de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethods.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={paymentMethods}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Bar dataKey="balance" fill="#4caf50" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                No hay medios de pago
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="stat-card" data-testid="recent-transactions-card">
        <CardHeader>
          <CardTitle>Transacciones Recientes</CardTitle>
          <CardDescription>Las últimas 5 transacciones</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.map((trans) => {
                const cat = categories.find(c => c.id === trans.categoryId);
                const pm = paymentMethods.find(p => p.id === trans.paymentMethodId);
                return (
                  <div key={trans.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`transaction-${trans.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{cat?.icon || '💰'}</div>
                      <div>
                        <div className="font-medium">{cat?.name || 'Sin categoría'}</div>
                        <div className="text-sm text-gray-500">{pm?.name || 'Sin medio'}</div>
                      </div>
                    </div>
                    <div className={`font-bold ${trans.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {trans.type === 'income' ? '+' : '-'}{formatCurrency(trans.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400">
              No hay transacciones aún
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};