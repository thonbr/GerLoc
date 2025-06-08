import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload, Loader2, FileCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { uploadFile } from '../../lib/storage';
import type { Database } from '../../lib/database.types';

type TenantDocument = Database['public']['Tables']['tenant_documents']['Row'];
type TenantDocumentInsert = Database['public']['Tables']['tenant_documents']['Insert'];

// Zod schema for tenant document form validation
const tenantDocumentSchema = z.object({
  tenant_id: z.string().uuid({ message: 'Selecione um locatário' }),
  document_type: z.string().min(1, { message: 'O tipo de documento é obrigatório' }),
  file_url: z.string().url({ message: 'URL do arquivo inválida' }).or(z.string().length(0)),
  expiration_date: z.string().optional().nullable(),
  notes: z.string().optional(),
});

type TenantDocumentFormData = z.infer<typeof tenantDocumentSchema>;

interface TenantDocumentFormProps {
  document?: TenantDocument;
  isOpen: boolean;
  onClose: () => void;
}

const TenantDocumentForm = ({ document, isOpen, onClose }: TenantDocumentFormProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch tenants for dropdown
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error(t('errors.noCompany'));

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('company_id', user.companyId)
        .eq('role', 'company_user')
        .order('full_name');

      if (error) throw error;
      return data;
    },
    enabled: !!user?.companyId,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<TenantDocumentFormData>({
    resolver: zodResolver(tenantDocumentSchema),
    defaultValues: {
      tenant_id: '',
      document_type: '',
      file_url: '',
      expiration_date: null,
      notes: '',
    },
  });

  const fileUrl = watch('file_url');

  // Reset form when document changes
  useEffect(() => {
    if (document) {
      reset({
        tenant_id: document.tenant_id,
        document_type: document.document_type,
        file_url: document.file_url,
        expiration_date: document.expiration_date?.split('T')[0] || null,
        notes: document.notes || '',
      });
    } else {
      reset({
        tenant_id: '',
        document_type: '',
        file_url: '',
        expiration_date: null,
        notes: '',
      });
    }
  }, [document, reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!file) return;
    if (!user?.companyId) {
      setError('Usuário não está associado a uma empresa');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Upload file to Supabase Storage
      const url = await uploadFile(
        file,
        'tenant-documents',
        `${user.companyId}`
      );

      clearInterval(interval);
      setUploadProgress(100);
      
      // Set the file URL in the form
      setValue('file_url', url);
      setFile(null);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload do arquivo');
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: TenantDocumentFormData) => {
    setError('');
    setLoading(true);

    try {
      if (!user?.companyId) {
        throw new Error(t('errors.noCompany'));
      }

      if (!data.file_url) {
        throw new Error('É necessário fazer upload de um arquivo');
      }

      const documentData: TenantDocumentInsert = {
        ...data,
        company_id: user.companyId,
        expiration_date: data.expiration_date ? new Date(data.expiration_date).toISOString() : null,
        notes: data.notes || null,
      };

      if (document?.id) {
        // Update existing document
        const { error } = await supabase
          .from('tenant_documents')
          .update(documentData)
          .eq('id', document.id);

        if (error) throw error;
      } else {
        // Insert new document
        const { error } = await supabase
          .from('tenant_documents')
          .insert([documentData]);

        if (error) throw error;
      }

      // Invalidate and refetch documents query
      await queryClient.invalidateQueries({ queryKey: ['tenant-documents'] });
      onClose();
    } catch (err) {
      console.error('Error saving tenant document:', err);
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const documentTypes = [
    'CNH',
    'RG',
    'CPF',
    'Comprovante de Residência',
    'Comprovante de Renda',
    'Outros',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {document ? 'Editar Documento' : 'Adicionar Documento'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-danger-50 p-4 text-sm text-danger-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tenant_id" className="form-label">
                Locatário
              </label>
              <select
                id="tenant_id"
                {...register('tenant_id')}
                className={`form-input w-full ${errors.tenant_id ? 'border-danger-500' : ''}`}
              >
                <option value="">Selecione um locatário</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.full_name}
                  </option>
                ))}
              </select>
              {errors.tenant_id && (
                <p className="mt-1 text-sm text-danger-600">{errors.tenant_id.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="document_type" className="form-label">
                Tipo de Documento
              </label>
              <select
                id="document_type"
                {...register('document_type')}
                className={`form-input w-full ${errors.document_type ? 'border-danger-500' : ''}`}
              >
                <option value="">Selecione o tipo</option>
                {documentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.document_type && (
                <p className="mt-1 text-sm text-danger-600">{errors.document_type.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">Documento</label>
              <div className="mt-1 flex items-center space-x-4">
                <div className="flex-1">
                  <div className="flex w-full items-center justify-center">
                    <label
                      htmlFor="file-upload"
                      className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 hover:bg-gray-100 ${
                        isUploading ? 'opacity-50' : ''
                      }`}
                    >
                      {fileUrl ? (
                        <div className="flex flex-col items-center">
                          <FileCheck className="h-10 w-10 text-success-500" />
                          <p className="mt-2 text-sm text-gray-500">Arquivo carregado com sucesso</p>
                          <a 
                            href={fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-500"
                          >
                            Visualizar arquivo
                          </a>
                        </div>
                      ) : isUploading ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
                          <p className="mt-2 text-sm text-gray-500">Enviando arquivo... {uploadProgress}%</p>
                          <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                            <div
                              className="h-2 rounded-full bg-primary-500"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Upload className="h-10 w-10 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">
                            <span className="font-semibold">Clique para selecionar</span> ou arraste e solte
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            PDF, PNG, JPG ou JPEG (máx. 10MB)
                          </p>
                        </div>
                      )}
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.png,.jpg,.jpeg"
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                </div>
                {file && !isUploading && !fileUrl && (
                  <button
                    type="button"
                    onClick={handleFileUpload}
                    className="btn btn-primary"
                  >
                    Enviar
                  </button>
                )}
              </div>
              {file && !isUploading && !fileUrl && (
                <p className="mt-2 text-sm text-gray-500">
                  Arquivo selecionado: {file.name}
                </p>
              )}
              <input
                type="hidden"
                {...register('file_url')}
              />
              {errors.file_url && (
                <p className="mt-1 text-sm text-danger-600">{errors.file_url.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="expiration_date" className="form-label">
                Data de Vencimento
              </label>
              <input
                id="expiration_date"
                type="date"
                {...register('expiration_date')}
                className={`form-input w-full ${errors.expiration_date ? 'border-danger-500' : ''}`}
              />
              {errors.expiration_date && (
                <p className="mt-1 text-sm text-danger-600">{errors.expiration_date.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="form-label">
              Observações
            </label>
            <textarea
              id="notes"
              rows={3}
              {...register('notes')}
              className={`form-input w-full ${errors.notes ? 'border-danger-500' : ''}`}
            />
            {errors.notes && (
              <p className="mt-1 text-sm text-danger-600">{errors.notes.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || isUploading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('common.save')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TenantDocumentForm;