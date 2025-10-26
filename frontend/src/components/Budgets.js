import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CurrencyInput } from './ui/currency-input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { budgetsAPI, categoriesAPI, transactionsAPI } from '../api';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Target, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMonth } from '../MonthContext';
import { formatCurrency } from '../utils/currency';

export const Budgets = () => {
  const { selectedMonth, setSelectedMonth } = useMonth();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [formData, setFormData] = useState({
    categoryId: '',
    amount: '',
    period: 'monthly',
  });

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    try {
      const [budgetsRes, catsRes, transRes] = await Promise.all([
        budgetsAPI.getAll(),
        categoriesAPI.getAll(),
        transactionsAPI.getAll(),
      ]);
      setBudgets(budgetsRes.data);
      setCategories(catsRes.data.filter(c => c.type === 'expense'));
      setTransactions(transRes.data);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBudget) {
        await budgetsAPI.update(editingBudget.id, formData);
        toast.success('Presupuesto actualizado');
      } else {
        await budgetsAPI.create(formData);
        toast.success('Presupuesto creado');
      }
      setDialogOpen(false);
      setFormData({ categoryId: '', amount: '', period: 'monthly' });
      setEditingBudget(null);
      fetchData();
    } catch (error) {
      toast.error('Error al guardar presupuesto');
    }
  };

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setFormData({
      categoryId: budget.categoryId,
      amount: budget.amount.toString(),
      period: budget.period,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este presupuesto?')) {
      try {
        await budgetsAPI.delete(id);
        toast.success('Presupuesto eliminado');
        fetchData();
      } catch (error) {
        toast.error('Error al eliminar presupuesto');
      }
    }
  };

  const calculateSpent = (categoryId, period) => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    
    return transactions
      .filter(t => (
        t.categoryId === categoryId &&
        t.type === 'expense' &&
        new Date(t.date) >= start &&
        new Date(t.date) <= end
      ))
      .reduce((sum, t) => sum + t.amount, 0);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  return (
    <div className="page-container pb-24" data-testid="budgets-page">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }} data-testid="budgets-title">
            Presupuestos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Controla tus gastos por categoría</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingBudget(null);
            setFormData({ categoryId: '', amount: '', period: 'monthly' });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-500 to-green-600" data-testid="add-budget-btn">
              <Plus className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="budget-dialog">
            <DialogHeader>
              <DialogTitle data-testid="budget-dialog-title">
                {editingBudget ? 'Editar' : 'Nuevo'} Presupuesto
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="budget-category">Categoría</Label>
                <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                  <SelectTrigger data-testid="budget-category-select">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-amount">Monto</Label>
                <CurrencyInput
                  id="budget-amount"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  data-testid="budget-amount-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-period">Periodo</Label>
                <Select value={formData.period} onValueChange={(value) => setFormData({ ...formData, period: value })}>
                  <SelectTrigger data-testid="budget-period-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <br></br>
              <Button type="submit" className="w-full bg-gradient-to-r from-green-500 to-green-600" data-testid="budget-submit-btn">
                {editingBudget ? 'Actualizar' : 'Crear'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Month Selector */}
      <Card className="stat-card mb-6" data-testid="month-selector-budgets">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
              data-testid="prev-month-btn-budgets"
              className="dark:text-gray-300"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <Calendar className="w-5 h-5 text-green-600" />
                <span data-testid="selected-month-budgets">
                  {format(selectedMonth, "MMMM yyyy", { locale: es })}
                </span>
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={handleCurrentMonth}
                className="text-xs text-green-600 dark:text-green-400 mt-1"
                data-testid="current-month-btn-budgets"
              >
                Ir al mes actual
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              data-testid="next-month-btn-budgets"
              className="dark:text-gray-300"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgets.map((budget) => {
          const cat = categories.find(c => c.id === budget.categoryId);
          const spent = calculateSpent(budget.categoryId, budget.period);
          const percentage = (spent / budget.amount) * 100;
          const isOverBudget = spent > budget.amount;

          return (
            <Card key={budget.id} className="stat-card" data-testid={`budget-${budget.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-3xl">{cat?.icon || '💰'}</div>
                    <div>
                      <CardTitle className="text-lg" data-testid={`budget-category-${budget.id}`}>
                        {cat?.name || 'Sin categoría'}
                      </CardTitle>
                      <CardDescription className="capitalize">{budget.period === 'monthly' ? 'Mensual' : 'Semanal'}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(budget)}
                      data-testid={`edit-budget-${budget.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(budget.id)}
                      data-testid={`delete-budget-${budget.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Gastado</span>
                  <span className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-green-600'}`} data-testid={`budget-spent-${budget.id}`}>
                    {formatCurrency(spent)} / {formatCurrency(budget.amount)}
                  </span>
                </div>
                <Progress
                  value={Math.min(percentage, 100)}
                  className={isOverBudget ? 'bg-red-100' : ''}
                  indicatorClassName={isOverBudget ? 'bg-red-500' : 'bg-green-500'}
                />
                <div className="text-center">
                  <span className={`text-lg font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                    {percentage.toFixed(0)}%
                  </span>
                  {isOverBudget && (
                    <p className="text-xs text-red-600 mt-1">¡Has excedido tu presupuesto!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {budgets.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400" data-testid="no-budgets">
            <Target className="w-16 h-16 mb-4" />
            <p>No hay presupuestos aún</p>
            <p className="text-sm">Crea tu primer presupuesto</p>
          </div>
        )}
      </div>
    </div>
  );
};