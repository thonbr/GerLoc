import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { HelpCircle, Book, Mail, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Support = () => {
  const { data: articles = [] } = useQuery({
    queryKey: ['featured-articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Central de Ajuda</h1>
        <p className="mt-1 text-sm text-gray-500">
          Encontre ajuda e recursos para usar o sistema
        </p>
      </div>

      {/* Quick links */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/faq"
          className="card flex items-center p-6 transition-all hover:shadow-lg"
        >
          <HelpCircle className="h-8 w-8 text-primary-500" />
          <div className="ml-4">
            <h3 className="font-medium text-gray-900">Perguntas Frequentes</h3>
            <p className="mt-1 text-sm text-gray-500">
              Encontre respostas para dúvidas comuns
            </p>
          </div>
        </Link>

        <Link
          to="/tutorials"
          className="card flex items-center p-6 transition-all hover:shadow-lg"
        >
          <Book className="h-8 w-8 text-secondary-500" />
          <div className="ml-4">
            <h3 className="font-medium text-gray-900">Tutoriais</h3>
            <p className="mt-1 text-sm text-gray-500">
              Aprenda a usar todas as funcionalidades
            </p>
          </div>
        </Link>

        <a
          href="mailto:suporte@motorent.com"
          className="card flex items-center p-6 transition-all hover:shadow-lg"
        >
          <Mail className="h-8 w-8 text-accent-500" />
          <div className="ml-4">
            <h3 className="font-medium text-gray-900">Contato</h3>
            <p className="mt-1 text-sm text-gray-500">
              Entre em contato com nosso suporte
            </p>
          </div>
        </a>
      </div>

      {/* Featured articles */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-medium text-gray-900">Artigos em Destaque</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <div key={article.id} className="card overflow-hidden">
              <div className="p-6">
                <h3 className="font-medium text-gray-900">{article.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-gray-500">
                  {article.content}
                </p>
                <Link
                  to={`/articles/${article.id}`}
                  className="mt-4 inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Ler mais
                  <svg className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat support */}
      <div className="rounded-lg bg-primary-50 p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <MessageCircle className="h-6 w-6 text-primary-600" />
          </div>
          <div className="ml-3">
            <h3 className="font-medium text-primary-900">Precisa de mais ajuda?</h3>
            <p className="mt-2 text-sm text-primary-700">
              Nossa equipe de suporte está disponível por chat das 9h às 18h, de segunda a sexta.
              Ficaremos felizes em ajudar!
            </p>
            <div className="mt-4">
              <button className="btn btn-primary">
                Iniciar chat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;