import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users as UsersIcon, Plus, Search, Filter, Mail, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import UserForm from '../../components/users/UserForm';

type Profile = Database['public']['Tables']['profiles']['Row'];

const Users = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Profile['role']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | boolean>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | undefined>();

  // Fetch users from Supabase
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error(t('errors.noCompany'));

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', user.companyId)
        .neq('id', user.id) // Exclude the current user
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.companyId,
  });

  // Filter users based on search term and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.is_active === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Format relative time
  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return t('users.details.never');
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h atrás`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  const handleAddUser = () => {
    setSelectedUser(undefined);
    setIsFormOpen(true);
  };

  const handleEditUser = (user: Profile) => {
    setSelectedUser(user);
    setIsFormOpen(true);
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
          <h1 className="text-2xl font-bold text-gray-900">{t('users.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('users.subtitle')}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button 
            onClick={handleAddUser}
            className="btn btn-primary flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('users.addUser')}
          </button>
        </div>
      </div>

      {/* Filters and search */}
      <div className="mb-6 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="all">{t('users.roles.all')}</option>
              <option value="company_admin">{t('users.roles.company_admin')}</option>
              <option value="company_user">{t('users.roles.company_user')}</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <select 
              value={statusFilter === 'all' ? 'all' : statusFilter.toString()}
              onChange={(e) => setStatusFilter(e.target.value === 'all' ? 'all' : e.target.value === 'true')}
              className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="all">{t('users.status.all')}</option>
              <option value="true">{t('users.status.active')}</option>
              <option value="false">{t('users.status.inactive')}</option>
            </select>
          </div>
        </div>
        
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 md:w-64"
          />
        </div>
      </div>

      {/* Users table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('users.details.name')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('users.details.role')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('users.details.status')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('users.details.lastActive')}
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                        <span className="font-medium">{user.full_name.charAt(0)}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Mail className="h-3 w-3" />
                        <span>{user.email}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <Shield className="mr-2 h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">
                      {t(`users.roles.${user.role}`)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    user.is_active 
                      ? 'bg-success-100 text-success-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.is_active ? t('users.status.active') : t('users.status.inactive')}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatRelativeTime(user.last_sign_in_at)}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <button 
                    onClick={() => handleEditUser(user)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    {t('common.edit')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {filteredUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <UsersIcon className="h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                ? t('users.noResults')
                : t('users.empty')}
            </h3>
            <div className="mt-6">
              <button 
                onClick={handleAddUser}
                className="btn btn-primary inline-flex items-center"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('users.addUser')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Form Modal */}
      <UserForm
        user={selectedUser}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedUser(undefined);
        }}
      />
    </div>
  );
};

export default Users;