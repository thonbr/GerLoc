import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  Bike, 
  Users, 
  FileText, 
  DollarSign, 
  Settings, 
  BarChart3,
  Building,
  Package,
  Activity,
  CreditCard,
  Truck,
  Receipt,
  FileCheck,
  Wrench,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const navigationItems = useMemo(() => {
    const commonItems = [
      {
        name: t('dashboard.title'),
        icon: LayoutDashboard,
        href: '/dashboard',
      }
    ];
    
    const platformItems = [
      {
        name: t('platform.overview.title'),
        icon: BarChart3,
        href: '/platform',
      },
      {
        name: t('platform.companies'),
        icon: Building,
        href: '/platform/companies',
      },
      {
        name: t('platform.users.title'),
        icon: Users,
        href: '/platform/users',
      },
      {
        name: t('platform.plans.title'),
        icon: Package,
        href: '/platform/plans',
      },
      {
        name: t('platform.systemHealth.title'),
        icon: Activity,
        href: '/platform/health',
      },
    ];
    
    const companyItems = [
      {
        name: t('vehicles.title'),
        icon: Bike,
        href: '/vehicles',
      },
      {
        name: 'Documentos de Veículos',
        icon: FileCheck,
        href: '/vehicle-documents',
      },
      {
        name: 'Manutenções',
        icon: Wrench,
        href: '/maintenances',
      },
      {
        name: 'Multas',
        icon: AlertTriangle,
        href: '/fines',
      },
      {
        name: t('tenants.title'),
        icon: Users,
        href: '/tenants',
      },
      {
        name: 'Documentos de Locatários',
        icon: FolderOpen,
        href: '/tenant-documents',
      },
      {
        name: t('contracts.title'),
        icon: FileText,
        href: '/contracts',
      },
      {
        name: 'Fornecedores',
        icon: Truck,
        href: '/suppliers',
      },
      {
        name: 'Despesas',
        icon: Receipt,
        href: '/expenses',
      },
      {
        name: t('finances.title'),
        icon: DollarSign,
        href: '/finances',
      },
      {
        name: t('users.title'),
        icon: Users,
        href: '/users',
      },
      {
        name: t('settings.billing'),
        icon: CreditCard,
        href: '/billing',
      },
      {
        name: t('settings.title'),
        icon: Settings,
        href: '/settings',
      },
    ];
    
    if (user?.role === 'platform_admin') {
      return [...commonItems, ...platformItems];
    }
    
    return [...commonItems, ...companyItems];
  }, [user, t]);

  return (
    <nav className="flex-1 overflow-y-auto p-4">
      <ul className="space-y-1">
        {navigationItems.map((item) => (
          <li key={item.name}>
            <NavLink
              to={item.href}
              className={({ isActive }) =>
                `flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
              end
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Sidebar;