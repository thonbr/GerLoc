import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Plus, Search, Filter, Edit2, Trash2, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import ExpenseForm from '../../components/expenses/ExpenseForm';

type Expense = Database['public']['Tables']['expenses']['Row'] & {
  vehicle?: {
    brand: string;
    model: string;
    plate: string;
  } | null;
  contract?: {
    tenant: {
      full_name: string;
    } | null;
  } | null;
};

const Expenses = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [loading, setLoading] = useState<string | null>(null);

  // Fetch expenses from Supabase
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error(t('errors.noCompany'));

      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          vehicle:vehicles(brand, model, plate),
          contract:contracts(
            tenant:profiles!contracts_tenant_id_fkey(full_name)
          )
        `)
        .eq('company_id', user.companyId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!user?.companyId,
  });

  // Filter expenses based on search term and category
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = 
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vehicle?.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vehicle?.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.contract?.tenant?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Get unique categories for filter
  const categories = Array.from(new Set(expenses.map(expense => expense.category))).sort();

  // Calculate total
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const handleAddExpense = () => {
    setSelectedExpense(undefined);
    setIsFormOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsFormOpen(true);
  };

  const handleDeleteExpense = async (expense: Expense) => {
    if (!window.confirm(`Tem certeza que deseja excluir esta despesa?`)) {
      return;
    }

    setLoading(expense.id);
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expense.id);

      if (error) throw error;

      // Invalidate and refetch expenses query
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
    } catch (err) {
      console.error('Error deleting expense:', err);
      alert(t('errors.unknown'));
    } finally {
      setLoading(null);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Despesas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie e controle todas as despesas da empresa
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button 
            onClick={handleAddExpense}
            className="btn btn-primary flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Despesa
          </button>
        </div>
      </div>

      {/* Summary card */}
      <div className="mb-6 card p-6">
        <div className="flex items-center">
          <div className="rounded-full bg-danger-100 p-3 text-danger-600">
            <DollarSign className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Total de Despesas</p>
            <h3 className="mt-1 text-2xl font-semibold text-gray-900">
              {formatCurrency(totalExpenses)}
            </h3>
          </div>
        </div>
      </div>

      {/* Filters and search */}
      <div className="mb-6 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Categoria:</span>
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">Todas</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar despesas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 md:w-64"
          />
        </div>
      </div>

      {/* Expenses table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Data
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Descrição
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Categoria
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Valor
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Associação
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredExpenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center text-sm text-gray-900">
                    <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                    {formatDate(expense.date)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {expense.description || 'Sem descrição'}
                  </div>
                  {expense.notes && (
                    <div className="text-sm text-gray-500 line-clamp-1">
                      {expense.notes}
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="inline-flex rounded-full bg-gray-100 px-2 text-xs font-semibold leading-5 text-gray-800">
                    {expense.category}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="text-sm font-medium text-danger-600">
                    {formatCurrency(expense.amount)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {expense.vehicle && (
                      <div>
                        {expense.vehicle.brand} {expense.vehicle.model} - {expense.vehicle.plate}
                      </div>
                    )}
                    {expense.contract?.tenant && (
                      <div className="text-gray-500">
                        Contrato: {expense.contract.tenant.full_name}
                      </div>
                    )}
                    {!expense.vehicle && !expense.contract?.tenant && (
                      <span className="text-gray-400">Despesa geral</span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => handleEditExpense(expense)}
                      className="rounded-md p-2 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:text-primary-700"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteExpense(expense)}
                      className="rounded-md p-2 text-sm font-medium text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                      disabled={loading === expense.id}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {filteredExpenses.length === 0 && !isLoading && (
          <div className="py-8 text-center">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm || categoryFilter !== 'all' 
                ? 'Nenhuma despesa encontrada' 
                : 'Nenhuma despesa cadastrada'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || categoryFilter !== 'all'
                ? 'Tente ajustar seus filtros de busca'
                : 'Comece adicionando sua primeira despesa'}
            </p>
            <button 
              onClick={handleAddExpense}
              className="mt-4 btn btn-primary"
            >
              <Plus className="mr-2 h-4 w-4" /> Adicionar Despesa
            </button>
          </div>
        )}
      </div>

      {/* Expense Form Modal */}
      <ExpenseForm
        expense={selectedExpense}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedExpense(undefined);
        }}
      />
    </div>
  );
};

export default Expenses;