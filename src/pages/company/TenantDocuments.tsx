import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, Plus, Search, Filter, Edit2, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { deleteFile } from '../../lib/storage';
import type { Database } from '../../lib/database.types';
import TenantDocumentForm from '../../components/tenants/TenantDocumentForm';

type TenantDocument = Database['public']['Tables']['tenant_documents']['Row'] & {
  tenant: {
    full_name: string;
    email: string;
  } | null;
};

const TenantDocuments = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<TenantDocument | undefined>();
  const [loading, setLoading] = useState<string | null>(null);

  // Fetch tenant documents from Supabase
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['tenant-documents', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error(t('errors.noCompany'));

      const { data, error } = await supabase
        .from('tenant_documents')
        .select(`
          *,
          tenant:profiles!tenant_documents_tenant_id_fkey(full_name, email)
        `)
        .eq('company_id', user.companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TenantDocument[];
    },
    enabled: !!user?.companyId,
  });

  // Filter documents based on search term and type
  const filteredDocuments = documents.filter(document => {
    const matchesSearch = 
      document.document_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      document.tenant?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      document.tenant?.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || document.document_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  // Get unique document types for filter
  const documentTypes = Array.from(new Set(documents.map(doc => doc.document_type))).sort();

  const handleAddDocument = () => {
    setSelectedDocument(undefined);
    setIsFormOpen(true);
  };

  const handleEditDocument = (document: TenantDocument) => {
    setSelectedDocument(document);
    setIsFormOpen(true);
  };

  const handleDeleteDocument = async (document: TenantDocument) => {
    if (!window.confirm(`Tem certeza que deseja excluir este documento?`)) {
      return;
    }

    setLoading(document.id);
    try {
      // First try to delete the file from storage if it's a Supabase Storage URL
      if (document.file_url.includes(supabase.supabaseUrl)) {
        try {
          await deleteFile(document.file_url, 'tenant-documents');
        } catch (fileError) {
          console.error('Error deleting file from storage:', fileError);
          // Continue with document deletion even if file deletion fails
        }
      }

      // Delete the document record
      const { error } = await supabase
        .from('tenant_documents')
        .delete()
        .eq('id', document.id);

      if (error) throw error;

      // Invalidate and refetch documents query
      await queryClient.invalidateQueries({ queryKey: ['tenant-documents'] });
    } catch (err) {
      console.error('Error deleting document:', err);
      alert(t('errors.unknown'));
    } finally {
      setLoading(null);
    }
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Check if document is expiring soon (within 30 days)
  const isExpiringSoon = (dateString: string | null) => {
    if (!dateString) return false;
    const expirationDate = new Date(dateString);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return expirationDate <= thirtyDaysFromNow && expirationDate >= today;
  };

  // Check if document is expired
  const isExpired = (dateString: string | null) => {
    if (!dateString) return false;
    const expirationDate = new Date(dateString);
    const today = new Date();
    return expirationDate < today;
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
          <h1 className="text-2xl font-bold text-gray-900">Documentos de Locatários</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie documentos e vencimentos dos locatários
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button 
            onClick={handleAddDocument}
            className="btn btn-primary flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Documento
          </button>
        </div>
      </div>

      {/* Filters and search */}
      <div className="mb-6 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Tipo:</span>
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">Todos</option>
            {documentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
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
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 md:w-64"
          />
        </div>
      </div>

      {/* Documents table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Locatário
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Tipo de Documento
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Vencimento
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredDocuments.map((document) => (
              <tr key={document.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary-100 text-primary-600">
                      <div className="flex h-full w-full items-center justify-center">
                        <FolderOpen className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {document.tenant?.full_name}
                      </div>
                      <div className="text-sm text-gray-500">{document.tenant?.email}</div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="text-sm text-gray-900">{document.document_type}</div>
                  {document.notes && (
                    <div className="text-sm text-gray-500 line-clamp-1">{document.notes}</div>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="text-sm text-gray-900">{formatDate(document.expiration_date)}</div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {document.expiration_date ? (
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      isExpired(document.expiration_date)
                        ? 'bg-danger-100 text-danger-800'
                        : isExpiringSoon(document.expiration_date)
                        ? 'bg-warning-100 text-warning-800'
                        : 'bg-success-100 text-success-800'
                    }`}>
                      {isExpired(document.expiration_date) ? (
                        <>
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Vencido
                        </>
                      ) : isExpiringSoon(document.expiration_date) ? (
                        <>
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Vence em breve
                        </>
                      ) : (
                        'Válido'
                      )}
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-gray-100 px-2 text-xs font-semibold leading-5 text-gray-800">
                      Sem vencimento
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <a
                      href={document.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md p-2 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:text-primary-700"
                      title="Visualizar documento"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button 
                      onClick={() => handleEditDocument(document)}
                      className="rounded-md p-2 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:text-primary-700"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteDocument(document)}
                      className="rounded-md p-2 text-sm font-medium text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                      disabled={loading === document.id}
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
        {filteredDocuments.length === 0 && !isLoading && (
          <div className="py-8 text-center">
            <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm || typeFilter !== 'all' 
                ? 'Nenhum documento encontrado' 
                : 'Nenhum documento cadastrado'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || typeFilter !== 'all'
                ? 'Tente ajustar seus filtros de busca'
                : 'Comece adicionando o primeiro documento'}
            </p>
            <button 
              onClick={handleAddDocument}
              className="mt-4 btn btn-primary"
            >
              <Plus className="mr-2 h-4 w-4" /> Adicionar Documento
            </button>
          </div>
        )}
      </div>

      {/* Document Form Modal */}
      <TenantDocumentForm
        document={selectedDocument}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedDocument(undefined);
        }}
      />
    </div>
  );
};

export default TenantDocuments;