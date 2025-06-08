import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

const FAQ = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openItem, setOpenItem] = useState<string | null>(null);

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['faqs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('category', 'faq')
        .eq('is_published', true)
        .order('created_at');

      if (error) throw error;
      return data;
    },
  });

  const filteredFaqs = faqs.filter(faq =>
    faq.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Perguntas Frequentes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Encontre respostas para as dúvidas mais comuns
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar perguntas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* FAQ list */}
      <div className="space-y-4">
        {filteredFaqs.map((faq) => (
          <div key={faq.id} className="rounded-lg border border-gray-200 bg-white">
            <button
              onClick={() => setOpenItem(openItem === faq.id ? null : faq.id)}
              className="flex w-full items-center justify-between px-4 py-5 sm:p-6"
            >
              <span className="text-left text-lg font-medium text-gray-900">{faq.title}</span>
              {openItem === faq.id ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
            {openItem === faq.id && (
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                <p className="text-base text-gray-500">{faq.content}</p>
              </div>
            )}
          </div>
        ))}

        {filteredFaqs.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
            <h3 className="text-sm font-medium text-gray-900">
              Nenhuma pergunta encontrada
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Tente buscar por outros termos ou entre em contato com nosso suporte
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FAQ;