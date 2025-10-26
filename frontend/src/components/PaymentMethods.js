import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { paymentMethodsAPI } from '../api';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Wallet, CreditCard, Banknote } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { formatCurrency } from '../utils/currency';

const PAYMENT_ICONS = {
  cash: '💵',
  bank: '🏦',
  card: '💳',
};

export const PaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPM, setEditingPM] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: '💵',
    type: 'cash',
  });

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const res = await paymentMethodsAPI.getAll();
      setPaymentMethods(res.data);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPM) {
        await paymentMethodsAPI.update(editingPM.id, formData);
        toast.success('Medio de pago actualizado');
      } else {
        await paymentMethodsAPI.create(formData);
        toast.success('Medio de pago creado');
      }
      setDialogOpen(false);
      setFormData({ name: '', icon: '💵', type: 'cash' });
      setEditingPM(null);
      fetchPaymentMethods();
    } catch (error) {
      toast.error('Error al guardar medio de pago');
    }
  };

  const handleEdit = (pm) => {
    setEditingPM(pm);
    setFormData({
      name: pm.name,
      icon: pm.icon,
      type: pm.type,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este medio de pago?')) {
      try {
        await paymentMethodsAPI.delete(id);
        toast.success('Medio de pago eliminado');
        fetchPaymentMethods();
      } catch (error) {
        toast.error('Error al eliminar medio de pago');
      }
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  return (
    <div className="page-container pb-24" data-testid="payment-methods-page">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }} data-testid="payment-methods-title">
            Medios de Pago
          </h1>
          <p className="text-gray-600">Gestiona tus cuentas y tarjetas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingPM(null);
            setFormData({ name: '', icon: '💵', type: 'cash' });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-500 to-green-600" data-testid="add-payment-method-btn">
              <Plus className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="payment-method-dialog">
            <DialogHeader>
              <DialogTitle data-testid="payment-method-dialog-title">
                {editingPM ? 'Editar' : 'Nuevo'} Medio de Pago
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pm-name">Nombre</Label>
                <Input
                  id="pm-name"
                  placeholder="Efectivo, Bancolombia, etc."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="pm-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pm-type">Tipo</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value, icon: PAYMENT_ICONS[value] })}>
                  <SelectTrigger data-testid="pm-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo 💵</SelectItem>
                    <SelectItem value="bank">Banco 🏦</SelectItem>
                    <SelectItem value="card">Tarjeta 💳</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pm-icon">Icono</Label>
                <Input
                  id="pm-icon"
                  placeholder="💵"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  required
                  data-testid="pm-icon-input"
                />
              </div>
              <br></br>
              <Button type="submit" className="w-full bg-gradient-to-r from-green-500 to-green-600" data-testid="pm-submit-btn">
                {editingPM ? 'Actualizar' : 'Crear'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paymentMethods.map((pm) => (
          <Card key={pm.id} className="stat-card" data-testid={`payment-method-${pm.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-3xl mb-2">{pm.icon}</div>
                  <CardTitle data-testid={`pm-name-${pm.id}`}>{pm.name}</CardTitle>
                  <CardDescription className="capitalize">{pm.type}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(pm)}
                    data-testid={`edit-pm-${pm.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(pm.id)}
                    data-testid={`delete-pm-${pm.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid={`pm-balance-${pm.id}`}>
                {formatCurrency(pm.balance)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Balance actual</div>
            </CardContent>
          </Card>
        ))}

        {paymentMethods.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400" data-testid="no-payment-methods">
            <Wallet className="w-16 h-16 mb-4" />
            <p>No hay medios de pago aún</p>
            <p className="text-sm">Agrega tu primer medio de pago</p>
          </div>
        )}
      </div>
    </div>
  );
};