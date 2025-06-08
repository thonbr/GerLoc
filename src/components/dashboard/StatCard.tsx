import { DivideIcon as LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeText: string;
  icon: LucideIcon;
  trend: 'up' | 'down' | 'neutral';
}

const StatCard = ({ title, value, change, changeText, icon: Icon, trend }: StatCardProps) => {
  return (
    <div className="card overflow-hidden">
      <div className="p-6">
        <div className="flex items-center">
          <div className="rounded-full bg-primary-100 p-3 text-primary-600">
            <Icon className="h-5 w-5" />
          </div>
          <div className="ml-5">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="mt-1 text-2xl font-semibold text-gray-900">{value}</h3>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center text-sm">
            <span className={`flex items-center ${
              trend === 'up' ? 'text-success-600' : 
              trend === 'down' ? 'text-danger-600' : 
              'text-gray-600'
            }`}>
              {trend === 'up' && <TrendingUp className="mr-1 h-4 w-4" />}
              {trend === 'down' && <TrendingDown className="mr-1 h-4 w-4" />}
              {change}
            </span>
            <span className="ml-1 text-gray-500">{changeText}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatCard;