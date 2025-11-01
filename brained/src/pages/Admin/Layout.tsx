import React from 'react';
import { Link, Outlet } from 'react-router-dom';

const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-4 gap-6">
        <aside className="col-span-1 bg-white rounded-lg p-4 shadow">
          <h3 className="font-semibold mb-4">Admin</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/admin/products" className="block p-2 rounded hover:bg-gray-50">Manage Products</Link>
            </li>
            <li>
              <Link to="/admin/preview" className="block p-2 rounded hover:bg-gray-50">Preview Featured</Link>
            </li>
          </ul>
        </aside>
        <main className="col-span-3">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
