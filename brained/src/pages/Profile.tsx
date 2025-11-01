import React from 'react';
import { useAuth } from '../context/AuthContext';

const Profile: React.FC = () => {
  const auth = useAuth();
  const user = auth.user;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Not signed in</h2>
          <p className="text-sm text-gray-500">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full py-20 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow p-8">
          <h2 className="text-2xl font-bold mb-4">Your Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-orange-500 flex items-center justify-center text-white text-3xl font-bold">{(user.name || user.email || 'U').charAt(0).toUpperCase()}</div>
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm text-gray-500 mb-1">Name</p>
              <h3 className="text-lg font-medium mb-4">{user.name || '—'}</h3>

              <p className="text-sm text-gray-500 mb-1">Email</p>
              <h3 className="text-lg font-medium mb-4">{user.email}</h3>

              <p className="text-sm text-gray-500 mb-1">Role</p>
              <h3 className="text-lg font-medium mb-4">{user.role || 'customer'}</h3>

              <div className="mt-6">
                <p className="text-sm text-gray-600">Authenticated: <span className="font-medium text-gray-900">Yes</span></p>
                <p className="text-sm text-gray-500 mt-2">Tokens are managed via httpOnly refresh cookie and short-lived access token. Use the logout button in the navbar to clear the session.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
