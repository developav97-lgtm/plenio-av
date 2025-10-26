import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { transactionsAPI, categoriesAPI, paymentMethodsAPI } from '../api';
import { toast } from 'sonner';
import { Trash2, ArrowUpCircle, ArrowDownCircle, Receipt, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths,parseISO ,isWithinInterval} from 'date-fns';
import { es } from 'date-fns/locale';
import { useMonth } from '../MonthContext';
import { formatCurrency } from '../utils/currency';

export const Transactions = () => {
  const { selectedMonth, setSelectedMonth } = useMonth();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const filterTransactionsByMonth = (allTransactions) => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);

    return allTransactions.filter(t => {
      const transDate = parseISO(t.date); // asegura que sea una fecha válida
      console.log(transDate)
      return isWithinInterval(transDate, { start, end });
    });
  };

  const fetchData = async () => {
    try {
      const [transRes, catsRes, pmsRes] = await Promise.all([
        transactionsAPI.getAll(),
        categoriesAPI.getAll(),
        paymentMethodsAPI.getAll(),
      ]);
      
      // Filter by selected month
      const filteredTransactions = filterTransactionsByMonth(transRes.data);
      
      setTransactions(filteredTransactions);
      setCategories(catsRes.data);
      setPaymentMethods(pmsRes.data);
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

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta transacción?')) {
      try {
        await transactionsAPI.delete(id);
        toast.success('Transacción eliminada');
        fetchData();
      } catch (error) {
        toast.error('Error al eliminar transacción');
      }
    }
  };
  const formatLocalDate = (dateString) => {
    const d = new Date(`${dateString}T00:00:00`);
    return format(d, "d 'de' MMMM, yyyy", { locale: es });
  };

  const groupTransactionsByDate = () => {
    const grouped = {};
    transactions.forEach((trans) => {
      const date = trans.date.split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(trans);
    });
    return grouped;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  const groupedTransactions = groupTransactionsByDate();

  return (
    <div className="page-container pb-24" data-testid="transactions-page">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }} data-testid="transactions-title">
          Movimientos
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Historial de todas tus transacciones</p>
      </div>

      {/* Month Selector */}
      <Card className="stat-card mb-6" data-testid="month-selector-trans">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
              data-testid="prev-month-btn-trans"
              className="dark:text-gray-300"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <Calendar className="w-5 h-5 text-green-600" />
                <span data-testid="selected-month-trans">
                  {format(selectedMonth, "MMMM yyyy", { locale: es })}
                </span>
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={handleCurrentMonth}
                className="text-xs text-green-600 dark:text-green-400 mt-1"
                data-testid="current-month-btn-trans"
              >
                Ir al mes actual.
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              data-testid="next-month-btn-trans"
              className="dark:text-gray-300"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {Object.keys(groupedTransactions).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedTransactions)
            .sort(([a], [b]) => new Date(b) - new Date(a))
            .map(([date, trans]) => (
              <div key={date}>
                <h2 className="text-sm font-semibold text-gray-500 mb-3 sticky top-16 bg-gradient-to-r from-green-50 to-blue-50 py-2 px-3 rounded-lg">
                  {formatLocalDate(date)}
                </h2>
                <div className="space-y-2">
                  {trans.map((t) => {
                    const cat = categories.find(c => c.id === t.categoryId);
                    const pm = paymentMethods.find(p => p.id === t.paymentMethodId);
                    return (
                      <Card key={t.id} className="stat-card mb-2" data-testid={`transaction-${t.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                t.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                              }`}>
                                {t.type === 'income' ? (
                                  <ArrowUpCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                  <ArrowDownCircle className="w-5 h-5 text-red-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{cat?.icon || '💰'}</span>
                                  <div>
                                    <div className="font-medium" data-testid={`trans-category-${t.id}`}>
                                      {cat?.name || 'Sin categoría'}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {pm?.icon} {pm?.name || 'Sin medio'}
                                    </div>
                                  </div>
                                </div>
                                {t.description && (
                                  <p className="text-sm text-gray-600 mt-1">{t.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`text-lg font-bold ${
                                t.type === 'income' ? 'text-green-600' : 'text-red-600'
                              }`} data-testid={`trans-amount-${t.id}`}>
                                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDelete(t.id)}
                                data-testid={`delete-trans-${t.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400" data-testid="no-transactions">
          <Receipt className="w-16 h-16 mb-4" />
          <p>No hay transacciones aún</p>
          <p className="text-sm">Agrega tu primera transacción usando el botón +</p>
        </div>
      )}
    </div>
  );
};