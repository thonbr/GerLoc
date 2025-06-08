import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building, Plus, Search, Edit2, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import SupplierForm from '../../components/suppliers/SupplierForm';

type Supplier = Database['public']['Tables']['suppliers']['Row'];

const Suppliers = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>();
  const [loading, setLoading] = useState<string | null>(null);

  // Fetch suppliers from Supabase
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error(t('errors.noCompany'));

      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', user.companyId)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!user?.companyId,
  });

  // Filter suppliers based on search term
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.services_provided?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSupplier = () => {
    setSelectedSupplier(undefined);
    setIsFormOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsFormOpen(true);
  };

  const handleDeleteSupplier = async (supplier: Supplier) => {
    if (!window.confirm(`Tem certeza que deseja excluir o fornecedor ${supplier.name}?`)) {
      return;
    }

    setLoading(supplier.id);
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplier.id);

      if (error) throw error;

      // Invalidate and refetch suppliers query
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    } catch (err) {
      console.error('Error deleting supplier:', err);
      alert(t('errors.unknown'));
    } finally {
      setLoading(null);
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie seus fornecedores de serviços e produtos
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button 
            onClick={handleAddSupplier}
            className="btn btn-primary flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Fornecedor
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar fornecedores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 md:w-64"
          />
        </div>
      </div>

      {/* Suppliers grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSuppliers.map((supplier) => (
          <div key={supplier.id} className="card overflow-hidden transition-all hover:shadow-lg">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div className="h-12 w-12 flex-shrink-0 rounded-full bg-primary-100 text-primary-600">
                    <div className="flex h-full w-full items-center justify-center">
                      <Building className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">{supplier.name}</h3>
                    {supplier.contact_person && (
                      <p className="text-sm text-gray-500">{supplier.contact_person}</p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEditSupplier(supplier)}
                    className="rounded-md p-2 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:text-primary-700"
                    title="Editar"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteSupplier(supplier)}
                    className="rounded-md p-2 text-sm font-medium text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                    disabled={loading === supplier.id}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {supplier.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="mr-2 h-4 w-4" />
                    {supplier.phone}
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="mr-2 h-4 w-4" />
                    {supplier.email}
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-start text-sm text-gray-600">
                    <MapPin className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span className="line-clamp-2">{supplier.address}</span>
                  </div>
                )}
              </div>

              {supplier.services_provided && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900">Serviços</h4>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-3">
                    {supplier.services_provided}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filteredSuppliers.length === 0 && !isLoading && (
        <div className="mt-8 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <Building className="h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            {searchTerm ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm
              ? `Nenhum fornecedor encontrado para "${searchTerm}"`
              : 'Comece adicionando seu primeiro fornecedor'}
          </p>
          <button 
            onClick={handleAddSupplier}
            className="mt-4 btn btn-primary"
          >
            <Plus className="mr-2 h-4 w-4" /> Adicionar Fornecedor
          </button>
        </div>
      )}

      {/* Supplier Form Modal */}
      <SupplierForm
        supplier={selectedSupplier}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedSupplier(undefined);
        }}
      />
    </div>
  );
};

export default Suppliers;