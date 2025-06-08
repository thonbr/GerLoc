import { Bell, Search, ChevronDown, Menu, Settings, LogOut, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header = ({ toggleSidebar }: HeaderProps) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('=== LOGOUT DEBUG START ===');
    console.log('Logout button clicked!');
    console.log('User before logout:', user);
    
    try {
      console.log('Calling logout function...');
      await logout();
      console.log('Logout function completed successfully');
      
      // Close dropdown
      setDropdownOpen(false);
      
      console.log('Dropdown closed, navigating to login...');
      // Navigate to login page
      navigate('/login');
      console.log('Navigation to login completed');
      
    } catch (error) {
      console.error('Error during logout:', error);
    }
    
    console.log('=== LOGOUT DEBUG END ===');
  };

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 lg:hidden"
          >
            <Menu size={24} />
          </button>
          
          <div className="relative hidden md:block">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t('common.search')}
              className="w-full rounded-md border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="relative rounded-full p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900">
            <Bell size={20} />
            <span className="absolute right-1 top-1 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-danger-500"></span>
            </span>
          </button>
          
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <div className="h-8 w-8 overflow-hidden rounded-full bg-primary-100 text-primary-800">
                <div className="flex h-full w-full items-center justify-center font-medium">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              </div>
              <span className="hidden text-sm font-medium text-gray-700 md:block">
                {user?.name || t('common.user')}
              </span>
              <ChevronDown size={16} className="hidden text-gray-400 md:block" />
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="border-b px-4 py-2">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  {user?.company && (
                    <p className="mt-1 text-xs font-medium text-primary-600">{user.company.name}</p>
                  )}
                </div>
                <Link 
                  to="/profile" 
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User className="mr-2 h-4 w-4" />
                  {t('profile.title')}
                </Link>
                <Link 
                  to="/settings" 
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  {t('settings.title')}
                </Link>
                <button 
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center px-4 py-2 text-sm text-danger-700 hover:bg-gray-100"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('auth.signOut')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;