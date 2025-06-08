import { useQuery } from '@tanstack/react-query';
import { Activity, Server, Database, Mail, CreditCard, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';

const SystemHealth = () => {
  const { t } = useTranslation();

  // Fetch service status
  const { data: services = [] } = useQuery({
    queryKey: ['service-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_status')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch active incidents
  const { data: incidents = [] } = useQuery({
    queryKey: ['system-incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch system metrics
  const { data: metrics = [] } = useQuery({
    queryKey: ['system-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_metrics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return t('common.timeAgo.minutes', { count: diffInMinutes });
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return t('common.timeAgo.hours', { count: hours });
    } else {
      return date.toLocaleDateString();
    }
  };

  const getServiceIcon = (serviceName: string) => {
    switch (serviceName) {
      case 'API Server':
        return <Server className="h-5 w-5 text-gray-600" />;
      case 'Database':
        return <Database className="h-5 w-5 text-gray-600" />;
      case 'Email Service':
        return <Mail className="h-5 w-5 text-gray-600" />;
      case 'Payment Gateway':
        return <CreditCard className="h-5 w-5 text-gray-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const getServiceTranslation = (serviceName: string) => {
    switch (serviceName) {
      case 'API Server':
        return t('platform.systemHealth.services.apiServer');
      case 'Database':
        return t('platform.systemHealth.services.database');
      case 'Email Service':
        return t('platform.systemHealth.services.emailService');
      case 'Payment Gateway':
        return t('platform.systemHealth.services.paymentGateway');
      default:
        return serviceName;
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('platform.systemHealth.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('platform.systemHealth.subtitle')}
        </p>
      </div>

      {/* System Status Overview */}
      <div className="mb-8">
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b p-4">
            <div className="flex items-center">
              <Activity className="h-5 w-5 text-primary-600" />
              <h2 className="ml-2 text-lg font-semibold text-gray-900">{t('platform.systemHealth.currentStatus')}</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <div key={service.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getServiceIcon(service.name)}
                    <span className="ml-2 font-medium text-gray-900">{getServiceTranslation(service.name)}</span>
                  </div>
                  {service.status === 'operational' && (
                    <CheckCircle className="h-5 w-5 text-success-500" />
                  )}
                  {service.status === 'degraded' && (
                    <AlertTriangle className="h-5 w-5 text-warning-500" />
                  )}
                  {service.status === 'down' && (
                    <XCircle className="h-5 w-5 text-danger-500" />
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('platform.systemHealth.metrics.uptime')}</span>
                    <span className="font-medium text-gray-900">{service.uptime.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('platform.systemHealth.metrics.latency')}</span>
                    <span className="font-medium text-gray-900">{service.latency}ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('common.lastCheck')}</span>
                    <span className="font-medium text-gray-900">{formatRelativeTime(service.last_check)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Incidents */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{t('platform.systemHealth.metrics.activeIncidents')}</h2>
        {incidents.length > 0 ? (
          <div className="space-y-4">
            {incidents.map((incident) => (
              <div key={incident.id} className="rounded-lg border border-warning-200 bg-warning-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-warning-500" />
                    <h3 className="ml-2 font-medium text-gray-900">{incident.title}</h3>
                  </div>
                  <span className="rounded-full bg-warning-100 px-2 py-1 text-xs font-medium text-warning-800">
                    {incident.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{incident.description}</p>
                <div className="mt-2 text-sm text-gray-500">
                  {formatRelativeTime(incident.created_at)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
            <CheckCircle className="mx-auto h-8 w-8 text-success-500" />
            <p className="mt-2 text-gray-600">{t('platform.systemHealth.metrics.noIncidents')}</p>
          </div>
        )}
      </div>

      {/* System Metrics */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{t('platform.systemHealth.metrics.title')}</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.id} className="card p-4">
              <h3 className="text-sm font-medium text-gray-900">{metric.name}</h3>
              <div className="mt-2">
                <div className="flex items-baseline">
                  <span className="text-2xl font-semibold text-gray-900">
                    {metric.value.toFixed(2)} {metric.unit}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div 
                      className="h-2 rounded-full bg-primary-500"
                      style={{ width: `${(metric.value / 100) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;