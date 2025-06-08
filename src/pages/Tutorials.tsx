import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Book, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Tutorials = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: tutorials = [], isLoading } = useQuery({
    queryKey: ['tutorials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('category', 'tutorial')
        .eq('is_published', true)
        .order('created_at');

      if (error) throw error;
      return data;
    },
  });

  const filteredTutorials = tutorials.filter(tutorial =>
    tutorial.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tutorial.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tutorial.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tutoriais</h1>
        <p className="mt-1 text-sm text-gray-500">
          Aprenda a usar todas as funcionalidades do sistema
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
            placeholder="Buscar tutoriais..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Tutorials grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTutorials.map((tutorial) => (
          <div key={tutorial.id} className="card overflow-hidden">
            <div className="flex h-48 items-center justify-center bg-primary-50">
              <Book className="h-12 w-12 text-primary-500" />
            </div>
            <div className="p-6">
              <h3 className="font-medium text-gray-900">{tutorial.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-gray-500">
                {tutorial.content}
              </p>
              {tutorial.tags && tutorial.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {tutorial.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <a
                href={`/tutorials/${tutorial.id}`}
                className="mt-4 inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Ver tutorial
                <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {filteredTutorials.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <Book className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Nenhum tutorial encontrado
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Tente buscar por outros termos ou entre em contato com nosso suporte
          </p>
        </div>
      )}
    </div>
  );
};

export default Tutorials;