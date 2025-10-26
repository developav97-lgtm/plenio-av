import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CurrencyInput } from './ui/currency-input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { categoriesAPI, paymentMethodsAPI, transactionsAPI } from '../api';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

export const QuickAddTransaction = ({ open, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [transactionType, setTransactionType] = useState('expense');
  const [formData, setFormData] = useState({
    amount: '',
    categoryId: '',
    paymentMethodId: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const [catsRes, pmsRes] = await Promise.all([
        categoriesAPI.getAll(),
        paymentMethodsAPI.getAll(),
      ]);
      setCategories(catsRes.data);
      setPaymentMethods(pmsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.categoryId || !formData.paymentMethodId) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      await transactionsAPI.create({
        type: transactionType,
        amount: parseFloat(formData.amount),
        categoryId: formData.categoryId,
        paymentMethodId: formData.paymentMethodId,
        description: formData.description || null,
        date: formData.date,
        isRecurring: false,
      });
      toast.success(`${transactionType === 'income' ? 'Ingreso' : 'Gasto'} agregado exitosamente`);
      setFormData({
        amount: '',
        categoryId: '',
        paymentMethodId: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error('Error al agregar transacción');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === transactionType);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="quick-add-dialog">
        <DialogHeader>
          <DialogTitle data-testid="quick-add-title">Agregar Transacción</DialogTitle>
          <DialogDescription>Registra un nuevo ingreso o gasto rápidamente</DialogDescription>
        </DialogHeader>

        <Tabs value={transactionType} onValueChange={setTransactionType} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expense" data-testid="expense-tab">Gasto</TabsTrigger>
            <TabsTrigger value="income" data-testid="income-tab">Ingreso</TabsTrigger>
          </TabsList>

          <TabsContent value={transactionType}>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Monto</Label>
                <CurrencyInput
                  id="amount"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  data-testid="amount-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                  <SelectTrigger data-testid="category-select">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} data-testid={`category-${cat.id}`}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Medio de Pago</Label>
                <Select value={formData.paymentMethodId} onValueChange={(value) => setFormData({ ...formData, paymentMethodId: value })}>
                  <SelectTrigger data-testid="payment-method-select">
                    <SelectValue placeholder="Selecciona un medio de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id} data-testid={`payment-method-${pm.id}`}>
                        {pm.icon} {pm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción (Opcional)</Label>
                <Input
                  id="description"
                  placeholder="Desayuno en la U"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="description-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  data-testid="date-input"
                />
              </div>
              <br></br>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                disabled={loading}
                data-testid="submit-transaction-btn"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Agregar Transacción'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};