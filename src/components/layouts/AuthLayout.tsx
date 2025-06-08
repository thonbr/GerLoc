import { Outlet } from 'react-router-dom';
import { Bike } from 'lucide-react';

const AuthLayout = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left side - form */}
      <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:w-1/2 xl:w-2/5">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <Bike size={32} className="text-primary-600" />
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">MotoRent</h2>
            </div>
            <h2 className="mt-6 text-2xl font-semibold leading-9 text-gray-900">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Motorcycle rental management made simple
            </p>
          </div>

          <Outlet />
        </div>
      </div>

      {/* Right side - image */}
      <div className="hidden lg:block lg:w-1/2 xl:w-3/5">
        <div 
          className="flex h-full items-center justify-center bg-cover bg-center" 
          style={{ 
            backgroundImage: `linear-gradient(rgba(17, 24, 39, 0.6), rgba(17, 24, 39, 0.6)), url('https://images.pexels.com/photos/2116475/pexels-photo-2116475.jpeg')` 
          }}
        >
          <div className="max-w-2xl text-center text-white">
            <h1 className="text-4xl font-bold">Complete Motorcycle Rental Management</h1>
            <p className="mt-4 text-xl">
              Streamline your motorcycle rental business with our comprehensive SaaS platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;