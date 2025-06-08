import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';

const AuditLogs = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:profiles!audit_logs_user_id_fkey(
            full_name,
            email
          ),
          company:companies!audit_logs_company_id_fkey(
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (actionFilter !== 'all') {
        query = query.eq('action_type', actionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredLogs = logs.filter(log => {
    const searchString = searchTerm.toLowerCase();
    return (
      log.action_type.toLowerCase().includes(searchString) ||
      log.user?.full_name.toLowerCase().includes(searchString) ||
      log.company?.name.toLowerCase().includes(searchString) ||
      JSON.stringify(log.details).toLowerCase().includes(searchString)
    );
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Logs de Auditoria</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitore todas as ações e eventos importantes do sistema
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">Todas as ações</option>
            <option value="user_login">Login</option>
            <option value="user_logout">Logout</option>
            <option value="user_register">Registro</option>
            <option value="company_created">Empresa criada</option>
            <option value="company_updated">Empresa atualizada</option>
            <option value="vehicle_created">Veículo criado</option>
            <option value="vehicle_updated">Veículo atualizado</option>
            <option value="contract_created">Contrato criado</option>
            <option value="contract_updated">Contrato atualizado</option>
          </select>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 md:w-64"
          />
        </div>
      </div>

      {/* Logs table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Data/Hora
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Ação
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Usuário
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Empresa
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Detalhes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {formatDate(log.created_at)}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="inline-flex rounded-full bg-gray-100 px-2 text-xs font-semibold leading-5 text-gray-800">
                    {log.action_type}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-100">
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {log.user?.full_name?.charAt(0) || '?'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{log.user?.full_name}</div>
                      <div className="text-sm text-gray-500">{log.user?.email}</div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {log.company?.name || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <pre className="whitespace-pre-wrap font-mono text-xs">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLogs.length === 0 && (
          <div className="py-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Nenhum log encontrado
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Tente ajustar seus filtros de busca
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;