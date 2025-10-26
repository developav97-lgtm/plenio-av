import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { categoriesAPI, suggestIcon } from '../api';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Sparkles, Loader2, Tag } from 'lucide-react';

export const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [suggestingIcon, setSuggestingIcon] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    icon: '💰',
    type: 'expense',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await categoriesAPI.getAll();
      setCategories(res.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestIcon = async () => {
    if (!formData.name) {
      toast.error('Escribe un nombre primero');
      return;
    }
    setSuggestingIcon(true);
    try {
      const res = await suggestIcon(formData.name);
      setFormData({ ...formData, icon: res.data.suggestedIcon });
      toast.success('Icono sugerido con IA');
    } catch (error) {
      toast.error('Error al sugerir icono');
    } finally {
      setSuggestingIcon(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCat) {
        await categoriesAPI.update(editingCat.id, formData);
        toast.success('Categoría actualizada');
      } else {
        await categoriesAPI.create(formData);
        toast.success('Categoría creada');
      }
      setDialogOpen(false);
      setFormData({ name: '', icon: '💰', type: 'expense' });
      setEditingCat(null);
      fetchCategories();
    } catch (error) {
      toast.error('Error al guardar categoría');
    }
  };

  const handleEdit = (cat) => {
    setEditingCat(cat);
    setFormData({
      name: cat.name,
      icon: cat.icon,
      type: cat.type,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta categoría?')) {
      try {
        await categoriesAPI.delete(id);
        toast.success('Categoría eliminada');
        fetchCategories();
      } catch (error) {
        toast.error('Error al eliminar categoría');
      }
    }
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  return (
    <div className="page-container pb-24" data-testid="categories-page">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }} data-testid="categories-title">
            Categorías
          </h1>
          <p className="text-gray-600">Organiza tus ingresos y gastos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingCat(null);
            setFormData({ name: '', icon: '💰', type: 'expense' });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-500 to-green-600" data-testid="add-category-btn">
              <Plus className="w-4 h-4 mr-2" />
              Agregar
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="category-dialog">
            <DialogHeader>
              <DialogTitle data-testid="category-dialog-title">
                {editingCat ? 'Editar' : 'Nueva'} Categoría
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Nombre</Label>
                <Input
                  id="cat-name"
                  placeholder="Comida, Transporte, Salario, etc."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="cat-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-type">Tipo</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger data-testid="cat-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Gasto</SelectItem>
                    <SelectItem value="income">Ingreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cat-icon">Icono</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSuggestIcon}
                    disabled={suggestingIcon}
                    data-testid="suggest-icon-btn"
                  >
                    {suggestingIcon ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Sugerir con IA
                  </Button>
                </div>
                <Input
                  id="cat-icon"
                  placeholder="💰"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  required
                  data-testid="cat-icon-input"
                  className="text-2xl text-center"
                />
              </div>
              <br></br>
              <Button type="submit" className="w-full bg-gradient-to-r from-green-500 to-green-600" data-testid="cat-submit-btn">
                {editingCat ? 'Actualizar' : 'Crear'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {/* Expense Categories */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-red-600" data-testid="expense-categories-title">Gastos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {expenseCategories.map((cat) => (
              <Card key={cat.id} className="stat-card relative group" data-testid={`category-${cat.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="text-4xl mb-2">{cat.icon}</div>
                    <div className="font-medium text-sm" data-testid={`cat-name-${cat.id}`}>{cat.name}</div>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => handleEdit(cat)}
                      data-testid={`edit-cat-${cat.id}`}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(cat.id)}
                      data-testid={`delete-cat-${cat.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Income Categories */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-green-600" data-testid="income-categories-title">Ingresos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {incomeCategories.map((cat) => (
              <Card key={cat.id} className="stat-card relative group" data-testid={`category-${cat.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="text-4xl mb-2">{cat.icon}</div>
                    <div className="font-medium text-sm" data-testid={`cat-name-${cat.id}`}>{cat.name}</div>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => handleEdit(cat)}
                      data-testid={`edit-cat-${cat.id}`}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(cat.id)}
                      data-testid={`delete-cat-${cat.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {categories.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400" data-testid="no-categories">
            <Tag className="w-16 h-16 mb-4" />
            <p>No hay categorías aún</p>
            <p className="text-sm">Agrega tu primera categoría</p>
          </div>
        )}
      </div>
    </div>
  );
};