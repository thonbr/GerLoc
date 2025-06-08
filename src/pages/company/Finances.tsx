import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, TrendingDown, Filter, Search, Download, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import RevenueChart from '../../components/dashboard/RevenueChart';

const Finances = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState('month');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch financial transactions (contracts + expenses)
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['financial-transactions', user?.companyId, dateRange],
    queryFn: async () => {
      if (!user?.companyId) throw new Error('No company ID found');

      let startDate;
      const now = new Date();

      switch (dateRange) {
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'quarter':
          startDate = new Date(now.setMonth(now.getMonth() - 3));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = new Date(now.setMonth(now.getMonth() - 1));
      }

      // Fetch contracts (income)
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select(`
          id,
          created_at,
          amount,
          payment_status,
          tenant:profiles!contracts_tenant_id_fkey(
            full_name
          ),
          vehicle:vehicles!contracts_vehicle_id_fkey(
            brand,
            model
          )
        `)
        .eq('company_id', user.companyId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (contractsError) throw contractsError;

      // Fetch expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          id,
          created_at,
          date,
          amount,
          description,
          category,
          vehicle:vehicles(brand, model)
        `)
        .eq('company_id', user.companyId)
        .gte('date', startDate.toISOString())
        .order('date', { ascending: false });

      if (expensesError) throw expensesError;

      // Combine and format transactions
      const allTransactions = [
        ...contracts.map(contract => ({
          id: contract.id,
          date: contract.created_at,
          description: `Aluguel - ${contract.vehicle?.brand} ${contract.vehicle?.model} para ${contract.tenant?.full_name}`,
          type: 'income' as const,
          amount: contract.amount,
          category: 'Aluguel',
          status: contract.payment_status === 'paid' ? 'completed' : contract.payment_status
        })),
        ...expenses.map(expense => ({
          id: expense.id,
          date: expense.date,
          description: expense.description || `${expense.category}${expense.vehicle ? ` - ${expense.vehicle.brand} ${expense.vehicle.model}` : ''}`,
          type: 'expense' as const,
          amount: expense.amount,
          category: expense.category,
          status: 'completed'
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return allTransactions;
    },
    enabled: !!user?.companyId,
  });

  // Calculate summary statistics
  const summary = transactions.reduce((acc, transaction) => {
    if (transaction.type === 'income') {
      acc.totalIncome += transaction.amount;
    } else {
      acc.totalExpenses += transaction.amount;
    }
    return acc;
  }, { totalIncome: 0, totalExpenses: 0 });

  const netIncome = summary.totalIncome - summary.totalExpenses;

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesType && matchesSearch;
  });

  // Get unique categories for filter
  const categories = Array.from(new Set(transactions.map(t => t.category))).sort();

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
      day: 'numeric'
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
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestão Financeira</h1>
        <p className="mt-1 text-sm text-gray-500">
          Acompanhe receitas, despesas e métricas de desempenho financeiro
        </p>
      </div>

      {/* Financial summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="rounded-full bg-primary-100 p-3 text-primary-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Receita Total</p>
              <h3 className="mt-1 text-2xl font-semibold text-gray-900">
                {formatCurrency(summary.totalIncome)}
              </h3>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="rounded-full bg-danger-100 p-3 text-danger-600">
              <TrendingDown className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total de Despesas</p>
              <h3 className="mt-1 text-2xl font-semibold text-gray-900">
                {formatCurrency(summary.totalExpenses)}
              </h3>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="rounded-full bg-success-100 p-3 text-success-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Lucro Líquido</p>
              <h3 className={`mt-1 text-2xl font-semibold ${
                netIncome >= 0 ? 'text-success-600' : 'text-danger-600'
              }`}>
                {formatCurrency(netIncome)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="mb-8 card overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold text-gray-900">Visão Geral da Receita</h2>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="week">Última Semana</option>
            <option value="month">Último Mês</option>
            <option value="quarter">Último Trimestre</option>
            <option value="year">Último Ano</option>
          </select>
        </div>
        <div className="p-4">
          <RevenueChart />
        </div>
      </div>

      {/* Transactions list */}
      <div className="card overflow-hidden">
        <div className="border-b p-4">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <h2 className="font-semibold text-gray-900">Histórico de Transações</h2>
            <button className="btn btn-primary flex items-center">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </button>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="all">Todas Categorias</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="all">Todos Tipos</option>
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </div>
            
            <div className="relative flex-1 md:max-w-xs">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar transações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Transactions table */}
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Descrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="inline-flex rounded-full px-2 text-xs font-semibold leading-5 text-gray-800">
                      {transaction.category}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`text-sm font-medium ${
                      transaction.type === 'income' ? 'text-success-600' : 'text-danger-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      transaction.status === 'completed' 
                        ? 'bg-success-100 text-success-800' 
                        : transaction.status === 'pending'
                        ? 'bg-warning-100 text-warning-800'
                        : 'bg-danger-100 text-danger-800'
                    }`}>
                      {transaction.status === 'completed' ? 'Concluído' :
                       transaction.status === 'pending' ? 'Pendente' : 'Atrasado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty state */}
          {filteredTransactions.length === 0 && (
            <div className="py-8 text-center">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma transação encontrada</h3>
              <p className="mt-1 text-sm text-gray-500">
                Tente ajustar seus filtros de busca
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Finances;