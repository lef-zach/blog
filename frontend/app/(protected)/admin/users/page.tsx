"use client";

import { useState, useEffect } from 'react';
import { apiClient, User } from '@/lib/api/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Shield, User as UserIcon, Plus, Edit2, X } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Simple Modal Component
const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg border">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'AUTHOR',
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getUsers();
      const data = response as any;
      if (Array.isArray(data)) {
        setUsers(data);
      } else if (Array.isArray(data.data)) {
        setUsers(data.data);
      } else {
        setUsers([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createUser(formData);
      setIsAddOpen(false);
      setFormData({ name: '', username: '', email: '', password: '', role: 'AUTHOR' });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await apiClient.updateUser(selectedUser.id, {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        password: formData.password || undefined,
        role: formData.role,
      });
      setIsEditOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user');
    }
  };

  const openEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      username: (user as any).username || '',
      email: user.email,
      password: '', // Password not editable directly here usually, but if needed we can add a separate flow.
      role: user.role,
    });
    setIsEditOpen(true);
  };

  // ... (handleDelete as before)
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiClient.deleteUser(id);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Users</h1>
            <p className="text-muted-foreground">Manage system users</p>
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </div>

        {error && <div className="mb-4 text-red-500">{error}</div>}

        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{(user as any).username || '-'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'ADMIN' ? 'destructive' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(user.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add User Modal */}
        <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New User">
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <Label>Username</Label>
              <Input
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                placeholder="Required if email is empty"
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="Optional if username is set"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Role</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="AUTHOR">Author</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit">Create User</Button>
            </div>
          </form>
        </Modal>

        {/* Edit User Modal */}
        <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit User">
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label>Username</Label>
              <Input
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                placeholder="Username"
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Leave blank to keep current"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div>
              <Label>Role</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="AUTHOR">Author</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
