import { useQuery } from '@tanstack/react-query';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const RevenueChart = () => {
  const { user } = useAuth();

  // Fetch revenue data for the last 6 months
  const { data: revenueData = [], isLoading } = useQuery({
    queryKey: ['revenue-chart', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error('No company ID found');

      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

      const { data, error } = await supabase
        .from('contracts')
        .select('amount, created_at')
        .eq('company_id', user.companyId)
        .eq('payment_status', 'paid')
        .gte('created_at', sixMonthsAgo.toISOString())
        .lte('created_at', now.toISOString())
        .order('created_at');

      if (error) throw error;

      // Group revenue by month
      const monthlyRevenue = data.reduce((acc, contract) => {
        const date = new Date(contract.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        acc[monthKey] = (acc[monthKey] || 0) + contract.amount;
        return acc;
      }, {} as Record<string, number>);

      // Generate data for the last 6 months
      const months = [];
      const revenue = [];
      
      for (let i = 0; i < 6; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleString('default', { month: 'short' });
        
        months.unshift(monthName);
        revenue.unshift(monthlyRevenue[monthKey] || 0);
      }

      return { months, revenue };
    },
    enabled: !!user?.companyId,
  });

  // Mock expenses data (as we don't have an expenses table)
  const expenses = revenueData.revenue?.map(rev => rev * 0.4) || [];

  const data = {
    labels: revenueData.months || [],
    datasets: [
      {
        label: 'Receita',
        data: revenueData.revenue || [],
        borderColor: 'rgb(37, 99, 235)',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Despesas',
        data: expenses,
        borderColor: 'rgb(220, 38, 38)',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('pt-BR', { 
                style: 'currency', 
                currency: 'BRL' 
              }).format(context.parsed.y);
            }
            return label;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('pt-BR', { 
              style: 'currency', 
              currency: 'BRL',
              maximumFractionDigits: 0,
            }).format(value as number);
          },
        },
      },
    },
  };

  if (isLoading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return <div style={{ height: '300px' }}><Line data={data} options={options} /></div>;
};

export default RevenueChart;