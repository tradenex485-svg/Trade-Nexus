'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { AuthGuard } from '@/components/auth/auth-guard';
import { usersApi } from '@/lib/api';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Mail, Shield, LogOut, Loader2, Edit, Save, X, Briefcase, Building2 } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated, logout, fetchProfile } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Editable fields
  const [name, setName] = useState('');
  const [traderCode, setTraderCode] = useState('');
  const [department, setDepartment] = useState('');
  const [deskName, setDeskName] = useState('');

  useEffect(() => {
    // Fetch profile data if needed after hydration
    if (_hasHydrated && user && !user.permissions) {
      fetchProfile();
    }

    // Initialize form fields with user data
    if (user) {
      setName(user.name || '');
      setTraderCode(user.trader_code || '');
      setDepartment(user.department || '');
      setDeskName(user.desk_name || '');
    }
  }, [_hasHydrated, user, fetchProfile]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    // Reset fields to original values
    if (user) {
      setName(user.name || '');
      setTraderCode(user.trader_code || '');
      setDepartment(user.department || '');
      setDeskName(user.desk_name || '');
    }
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!name || name.trim().length === 0) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await usersApi.updateProfile({
        name: name.trim(),
        trader_code: traderCode || undefined,
        department: department || undefined,
        desk_name: deskName || undefined,
      });

      if (response.success) {
        setSuccess('Profile updated successfully');
        setIsEditing(false);
        // Refresh the user profile
        await fetchProfile();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to update profile');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <AuthGuard>
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-slate-400">Loading profile...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-white">Profile</h1>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-500/10 border-green-500/20 text-green-400 mb-6">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {/* User Information */}
              <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div>
                    <CardTitle className="text-white flex items-center">
                      <User className="h-5 w-5 mr-2 text-blue-400" />
                      User Information
                    </CardTitle>
                    <CardDescription className="text-slate-400 mt-2">
                      Your account details
                    </CardDescription>
                  </div>
                  {!isEditing && (
                    <Button
                      onClick={handleEdit}
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-slate-200 hover:bg-slate-700"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-slate-300">Full Name *</Label>
                        <Input
                          id="name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="bg-slate-700/50 border-slate-600 text-white"
                          disabled={loading}
                          required
                        />
                      </div>

                      <Separator className="bg-slate-700" />

                      <div className="space-y-2">
                        <Label htmlFor="trader_code" className="text-slate-300">Trader Code</Label>
                        <Input
                          id="trader_code"
                          type="text"
                          value={traderCode}
                          onChange={(e) => setTraderCode(e.target.value)}
                          className="bg-slate-700/50 border-slate-600 text-white"
                          disabled={loading}
                          placeholder="Optional"
                        />
                      </div>

                      <Separator className="bg-slate-700" />

                      <div className="space-y-2">
                        <Label htmlFor="department" className="text-slate-300">Department</Label>
                        <Input
                          id="department"
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="bg-slate-700/50 border-slate-600 text-white"
                          disabled={loading}
                          placeholder="Optional"
                        />
                      </div>

                      <Separator className="bg-slate-700" />

                      <div className="space-y-2">
                        <Label htmlFor="desk_name" className="text-slate-300">Desk Name</Label>
                        <Input
                          id="desk_name"
                          type="text"
                          value={deskName}
                          onChange={(e) => setDeskName(e.target.value)}
                          className="bg-slate-700/50 border-slate-600 text-white"
                          disabled={loading}
                          placeholder="Optional"
                        />
                      </div>

                      <Separator className="bg-slate-700" />

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={handleSave}
                          disabled={loading}
                          className="bg-blue-600 hover:bg-blue-700 flex-1"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handleCancel}
                          disabled={loading}
                          variant="outline"
                          className="border-slate-600 text-slate-200"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm text-slate-400">Full Name</p>
                        <p className="text-white font-medium">{user.name}</p>
                      </div>

                      <Separator className="bg-slate-700" />

                      <div>
                        <p className="text-sm text-slate-400 flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          Email
                        </p>
                        <p className="text-white font-medium">{user.email}</p>
                      </div>

                      <Separator className="bg-slate-700" />

                      {user.trader_code && (
                        <>
                          <div>
                            <p className="text-sm text-slate-400 flex items-center">
                              <User className="h-4 w-4 mr-1" />
                              Trader Code
                            </p>
                            <p className="text-white font-medium">{user.trader_code}</p>
                          </div>
                          <Separator className="bg-slate-700" />
                        </>
                      )}

                      {user.department && (
                        <>
                          <div>
                            <p className="text-sm text-slate-400 flex items-center">
                              <Building2 className="h-4 w-4 mr-1" />
                              Department
                            </p>
                            <p className="text-white font-medium">{user.department}</p>
                          </div>
                          <Separator className="bg-slate-700" />
                        </>
                      )}

                      {user.desk_name && (
                        <>
                          <div>
                            <p className="text-sm text-slate-400 flex items-center">
                              <Briefcase className="h-4 w-4 mr-1" />
                              Desk Name
                            </p>
                            <p className="text-white font-medium">{user.desk_name}</p>
                          </div>
                          <Separator className="bg-slate-700" />
                        </>
                      )}

                      <div>
                        <p className="text-sm text-slate-400">User ID</p>
                        <p className="text-slate-300 font-mono text-sm">{user.id}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Role & Permissions */}
              <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-green-400" />
                    Role & Permissions
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Your access level and capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-400 mb-2">Role</p>
                    <Badge
                      variant="outline"
                      className={`
                        ${user.role_name === 'admin' ? 'border-purple-500 text-purple-400' : ''}
                        ${user.role_name === 'compliance_officer' ? 'border-blue-500 text-blue-400' : ''}
                        ${user.role_name === 'trader' ? 'border-green-500 text-green-400' : ''}
                        ${user.role_name === 'auditor' ? 'border-yellow-500 text-yellow-400' : ''}
                      `}
                    >
                      {user.role_name?.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>

                  {user.company_name && (
                    <>
                      <Separator className="bg-slate-700" />
                      <div>
                        <p className="text-sm text-slate-400">Company</p>
                        <p className="text-white font-medium">{user.company_name}</p>
                      </div>
                    </>
                  )}

                  {user.permissions && user.permissions.length > 0 && (
                    <>
                      <Separator className="bg-slate-700" />
                      <div>
                        <p className="text-sm text-slate-400 mb-2">
                          Permissions ({user.permissions.length})
                        </p>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {user.permissions.map((permission: string) => (
                            <div
                              key={permission}
                              className="text-xs text-slate-300 bg-slate-700/50 px-2 py-1 rounded"
                            >
                              {permission}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Account Actions */}
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur mt-6">
              <CardHeader>
                <CardTitle className="text-white">Account Actions</CardTitle>
                <CardDescription className="text-slate-400">
                  Manage your account settings
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-4">
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-200 hover:bg-slate-700"
                  onClick={() => router.push('/settings')}
                >
                  Manage Settings
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AuthGuard>
  );
}
