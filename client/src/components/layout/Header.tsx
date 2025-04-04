import React from 'react';
import { Link } from 'react-router-dom';
import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  userName?: string;
}

const Header: React.FC<HeaderProps> = ({ userName = 'مجتبی' }) => {
  return (
    <header className="fixed top-0 right-0 left-0 bg-white border-b border-gray-200 h-16 shadow-sm z-40">
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center">
          <div className="relative group">
            <button className="flex items-center focus:outline-none">
              <UserCircleIcon className="h-8 w-8 text-gray-600" />
              <span className="ml-2 text-sm font-medium hidden sm:block">{userName}</span>
            </button>
            <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition duration-300 border border-gray-200 transform origin-top-right">
              <div className="py-1">
                <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-right">پروفایل</Link>
                <Link to="/logout" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-right">خروج</Link>
              </div>
            </div>
          </div>
          
          <div className="relative mx-3">
            <button className="relative p-1 rounded-full hover:bg-gray-100 focus:outline-none">
              <BellIcon className="h-6 w-6 text-gray-600" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center">
          <Link to="/" className="flex items-center">
            <span className="font-bold text-xl text-primary">هوشی</span>
            <img 
              src="/logo192.png" 
              alt="هوشی" 
              className="h-10 w-10 ml-2 hidden sm:block"
              onError={(e) => {
                e.currentTarget.onerror = null; 
                e.currentTarget.style.display = 'none';
              }}
            />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header; 