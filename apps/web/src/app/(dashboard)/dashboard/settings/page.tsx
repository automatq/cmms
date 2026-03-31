'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/providers/auth-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Settings, Building2, User, Bell, Shield, Smartphone, Zap, Mail, Wrench, ClipboardCheck, Package, Users, Plus, Edit, UserCheck, UserX, MapPin, Tag, Trash2, CreditCard, ExternalLink, Loader2, Download, Upload, Palette, Check, Sun, Moon, Monitor } from 'lucide-react'
import { CsvImportDialog } from '@/components/csv-import-dialog'
import { useColorTheme } from '@/components/color-theme-provider'
import { useTheme } from 'next-themes'

export default function SettingsPage() {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState('general')

    const { data: organization, isLoading: isOrgLoading } = useQuery({
        queryKey: ['organization'],
        queryFn: () => api.getOrganization().then((res) => res.data),
    })

    const updateOrgMutation = useMutation({
        mutationFn: (data: any) => api.updateOrganization(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organization'] })
            toast.success('Settings updated successfully')
        },
        onError: (error) => {
            console.error('Failed to update settings:', error)
            toast.error('Failed to update settings')
        },
    })

    if (isOrgLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <div className="grid gap-6">
                    <Skeleton className="h-[400px] w-full" />
                </div>
            </div>
        )
    }

    const handleUpdateOrg = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const data = {
            name: formData.get('name'),
            timezone: formData.get('timezone'),
            currency: formData.get('currency'),
            logoUrl: formData.get('logoUrl'),
        }
        updateOrgMutation.mutate(data)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your organization settings and preferences.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="flex flex-wrap w-full md:w-auto gap-2">
                    <TabsTrigger value="general" className="gap-2">
                        <Building2 className="h-4 w-4" />
                        Organization
                    </TabsTrigger>
                    <TabsTrigger value="modules" className="gap-2">
                        <Zap className="h-4 w-4" />
                        Modules
                    </TabsTrigger>
                    <TabsTrigger value="profile" className="gap-2">
                        <User className="h-4 w-4" />
                        Profile
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="gap-2">
                        <Bell className="h-4 w-4" />
                        Notifications
                    </TabsTrigger>
                    <TabsTrigger value="team" className="gap-2">
                        <Users className="h-4 w-4" />
                        Team
                    </TabsTrigger>
                    <TabsTrigger value="locations" className="gap-2">
                        <MapPin className="h-4 w-4" />
                        Locations
                    </TabsTrigger>
                    <TabsTrigger value="categories" className="gap-2">
                        <Tag className="h-4 w-4" />
                        Categories
                    </TabsTrigger>
                    <TabsTrigger value="roles" className="gap-2">
                        <Shield className="h-4 w-4" />
                        Roles
                    </TabsTrigger>
                    <TabsTrigger value="billing" className="gap-2">
                        <CreditCard className="h-4 w-4" />
                        Billing
                    </TabsTrigger>
                    <TabsTrigger value="appearance" className="gap-2">
                        <Palette className="h-4 w-4" />
                        Appearance
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Organization Details</CardTitle>
                            <CardDescription>
                                Update your organization's basic information and preferences.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpdateOrg} className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Organization Name</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        defaultValue={organization?.name}
                                        placeholder="Enter organization name"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="logoUrl">Logo URL</Label>
                                    <Input
                                        id="logoUrl"
                                        name="logoUrl"
                                        defaultValue={organization?.logoUrl}
                                        placeholder="https://example.com/logo.png"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="timezone">Timezone</Label>
                                        <Input
                                            id="timezone"
                                            name="timezone"
                                            defaultValue={organization?.timezone || 'UTC'}
                                            placeholder="e.g. America/New_York"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="currency">Currency</Label>
                                        <Input
                                            id="currency"
                                            name="currency"
                                            defaultValue={organization?.currency || 'USD'}
                                            placeholder="e.g. USD, EUR"
                                        />
                                    </div>
                                </div>
                                <Button type="submit" disabled={updateOrgMutation.isPending}>
                                    {updateOrgMutation.isPending ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="modules" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Module Management</CardTitle>
                            <CardDescription>
                                Enable or disable specific features based on your needs.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between space-x-2">
                                <div className="flex flex-col space-y-1">
                                    <Label>Preventive Maintenance</Label>
                                    <p className="text-sm text-muted-foreground">Managed by your subscription plan.</p>
                                </div>
                                <Switch
                                    checked={organization?.modules?.preventiveMaintenance}
                                    disabled
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                                <div className="flex flex-col space-y-1">
                                    <Label>Inventory Management</Label>
                                    <p className="text-sm text-muted-foreground">Managed by your subscription plan.</p>
                                </div>
                                <Switch
                                    checked={organization?.modules?.inventory}
                                    disabled
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                                <div className="flex flex-col space-y-1">
                                    <Label>AI Assistant</Label>
                                    <p className="text-sm text-muted-foreground">Managed by your subscription plan.</p>
                                </div>
                                <Switch
                                    checked={organization?.modules?.aiAssistant}
                                    disabled
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                                <div className="flex flex-col space-y-1">
                                    <Label>Work Requests Portal</Label>
                                    <p className="text-sm text-muted-foreground">Managed by your subscription plan.</p>
                                </div>
                                <Switch
                                    checked={organization?.modules?.workRequestsPortal}
                                    disabled
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="profile" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Profile</CardTitle>
                            <CardDescription>
                                View and manage your personal account information.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-1">
                                    <Label className="text-muted-foreground">Username</Label>
                                    <p className="font-medium">{user?.username || 'N/A'}</p>
                                </div>
                                <div className="grid gap-1">
                                    <Label className="text-muted-foreground">Email</Label>
                                    <p className="font-medium">{user?.email || 'N/A'}</p>
                                </div>
                                <div className="grid gap-1">
                                    <Label className="text-muted-foreground">First Name</Label>
                                    <p className="font-medium">{user?.firstName || 'N/A'}</p>
                                </div>
                                <div className="grid gap-1">
                                    <Label className="text-muted-foreground">Last Name</Label>
                                    <p className="font-medium">{user?.lastName || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="pt-4 border-t">
                                <p className="text-sm text-muted-foreground">
                                    Roles:{' '}
                                    <span className="font-medium text-foreground">
                                        {user?.roles?.join(', ') || 'No roles assigned'}
                                    </span>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <NotificationsTab />
                <TeamTab />
                <LocationsTab />
                <CategoriesTab />
                <RolesTab />
                <BillingTab />
                <AppearanceTab />
            </Tabs>
        </div>
    )
}

const NOTIFICATION_PREFS = [
    {
        section: 'Work Orders',
        icon: Wrench,
        items: [
            { key: 'email_wo_assigned', label: 'Work order assigned', description: 'When a work order is assigned to you' },
            { key: 'email_wo_status_changed', label: 'Status changes', description: 'When a work order you created or are assigned to changes status' },
        ],
    },
    {
        section: 'Preventive Maintenance',
        icon: ClipboardCheck,
        items: [
            { key: 'email_pm_due', label: 'PM due', description: 'When a preventive maintenance plan is due or triggered' },
        ],
    },
    {
        section: 'Inventory',
        icon: Package,
        items: [
            { key: 'email_low_stock', label: 'Low stock alerts', description: 'When a part falls below its minimum stock level' },
        ],
    },
    {
        section: 'Requests',
        icon: Mail,
        items: [
            { key: 'email_work_request', label: 'New work requests', description: 'When a new work request is submitted' },
        ],
    },
]

function NotificationsTab() {
    const queryClient = useQueryClient()

    const { data: profile, isLoading } = useQuery({
        queryKey: ['my-profile'],
        queryFn: () => api.getMyProfile().then((res) => res.data),
    })

    const mutation = useMutation({
        mutationFn: (prefs: Record<string, boolean>) => api.updateNotificationPreferences(prefs),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-profile'] })
            toast.success('Notification preferences updated')
        },
        onError: () => {
            toast.error('Failed to update preferences')
        },
    })

    const prefs: Record<string, boolean> = profile?.notificationPreferences || {}

    const handleToggle = (key: string, checked: boolean) => {
        const updated = { ...prefs, [key]: checked }
        mutation.mutate(updated)
    }

    if (isLoading) {
        return (
            <TabsContent value="notifications" className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-72 mt-1" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>
        )
    }

    return (
        <TabsContent value="notifications" className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Email Notifications</CardTitle>
                    <CardDescription>
                        Choose which email notifications you'd like to receive. All toggles are on by default.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    {NOTIFICATION_PREFS.map((section) => (
                        <div key={section.section} className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <section.icon className="h-4 w-4" />
                                {section.section}
                            </div>
                            <div className="space-y-4 pl-6">
                                {section.items.map((item) => (
                                    <div key={item.key} className="flex items-center justify-between gap-4">
                                        <div className="flex flex-col space-y-0.5">
                                            <Label htmlFor={item.key}>{item.label}</Label>
                                            <p className="text-sm text-muted-foreground">{item.description}</p>
                                        </div>
                                        <Switch
                                            id={item.key}
                                            checked={prefs[item.key] !== false}
                                            onCheckedChange={(checked) => handleToggle(item.key, checked)}
                                            disabled={mutation.isPending}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </TabsContent>
    )
}

const emptyUserForm = { firstName: '', lastName: '', email: '', username: '', phone: '', jobTitle: '', department: '', hourlyRate: '', roleIds: [] as string[] }

function TeamTab() {
    const queryClient = useQueryClient()
    const [showDialog, setShowDialog] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState(emptyUserForm)

    const { data: usersData, isLoading } = useQuery({
        queryKey: ['users-team'],
        queryFn: async () => {
            const res = await api.getUsers({ limit: 200 })
            return res.data?.data || res.data || []
        },
    })

    const { data: rolesData } = useQuery({
        queryKey: ['roles'],
        queryFn: async () => {
            const res = await api.getRoles()
            return res.data || []
        },
    })

    const saveMutation = useMutation({
        mutationFn: (data: any) =>
            editingId ? api.updateUser(editingId, data) : api.createUser(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users-team'] })
            setShowDialog(false)
            setEditingId(null)
            setForm(emptyUserForm)
            toast.success(editingId ? 'User updated' : 'User created')
        },
        onError: (error: any) => {
            const msg = error.response?.data?.message
            toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to save user')
        },
    })

    const toggleStatusMutation = useMutation({
        mutationFn: async ({ userId, activate }: { userId: string; activate: boolean }) => {
            if (activate) return api.activateUser(userId)
            return api.deactivateUser(userId)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users-team'] })
            toast.success('User status updated')
        },
        onError: () => toast.error('Failed to update user status'),
    })

    const users = Array.isArray(usersData) ? usersData : []
    const roles = Array.isArray(rolesData) ? rolesData : []

    const openEdit = (user: any) => {
        setEditingId(user.id)
        setForm({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            username: user.username || '',
            phone: user.phone || '',
            jobTitle: user.jobTitle || '',
            department: user.department || '',
            hourlyRate: user.hourlyRate ? String(user.hourlyRate) : '',
            roleIds: user.roles?.map((r: any) => r.id || r) || [],
        })
        setShowDialog(true)
    }

    const openCreate = () => {
        setEditingId(null)
        setForm(emptyUserForm)
        setShowDialog(true)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const data: any = {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone || undefined,
            jobTitle: form.jobTitle || undefined,
            department: form.department || undefined,
            hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
            roleIds: form.roleIds.length > 0 ? form.roleIds : undefined,
        }
        if (!editingId) {
            data.username = form.username
            data.id = crypto.randomUUID()
        }
        saveMutation.mutate(data)
    }

    const handleRoleToggle = (roleId: string) => {
        setForm(prev => ({
            ...prev,
            roleIds: prev.roleIds.includes(roleId)
                ? prev.roleIds.filter(id => id !== roleId)
                : [...prev.roleIds, roleId],
        }))
    }

    if (isLoading) {
        return (
            <TabsContent value="team" className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent>
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-14 w-full mb-2" />
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>
        )
    }

    return (
        <TabsContent value="team" className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Team Members</CardTitle>
                            <CardDescription>{users.length} member(s) in your organization</CardDescription>
                        </div>
                        <Button onClick={openCreate}>
                            <Plus className="h-4 w-4 mr-2" /> Add User
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-b-lg overflow-hidden">
                        <div className="grid grid-cols-6 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <span className="col-span-2">Name</span>
                            <span>Job Title</span>
                            <span>Roles</span>
                            <span>Status</span>
                            <span>Actions</span>
                        </div>
                        <div className="divide-y">
                            {users.map((user: any) => {
                                const isActive = user.status === 'active'
                                return (
                                    <div key={user.id} className="grid grid-cols-6 gap-4 p-3 items-center">
                                        <div className="col-span-2 flex items-center gap-3">
                                            <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                                {user.firstName?.[0]}{user.lastName?.[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
                                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm text-muted-foreground">{user.jobTitle || '-'}</span>
                                        <div className="flex flex-wrap gap-1">
                                            {user.roles?.map((role: any) => (
                                                <Badge key={role.id || role} variant="secondary" className="text-xs">
                                                    {role.name || role}
                                                </Badge>
                                            )) || <span className="text-xs text-muted-foreground">-</span>}
                                        </div>
                                        <Badge variant={isActive ? 'default' : 'secondary'}>
                                            {isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                                                <Edit className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => toggleStatusMutation.mutate({ userId: user.id, activate: !isActive })}
                                                disabled={toggleStatusMutation.isPending}
                                            >
                                                {isActive ? <UserX className="h-3.5 w-3.5 text-destructive" /> : <UserCheck className="h-3.5 w-3.5 text-green-600" />}
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit User' : 'Add User'}</DialogTitle>
                        <DialogDescription>{editingId ? 'Update user details.' : 'Invite a new team member.'}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>First Name *</Label>
                                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Last Name *</Label>
                                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email *</Label>
                                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                            </div>
                            {!editingId && (
                                <div className="space-y-2">
                                    <Label>Username *</Label>
                                    <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Hourly Rate</Label>
                                <Input type="number" step="0.01" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Job Title</Label>
                                <Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                            </div>
                        </div>
                        {roles.length > 0 && (
                            <div className="space-y-2">
                                <Label>Roles</Label>
                                <div className="flex flex-wrap gap-2">
                                    {roles.map((role: any) => (
                                        <button
                                            key={role.id}
                                            type="button"
                                            onClick={() => handleRoleToggle(role.id)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                                form.roleIds.includes(role.id)
                                                    ? 'bg-primary text-primary-foreground border-primary'
                                                    : 'bg-background hover:bg-muted border-border'
                                            }`}
                                        >
                                            {role.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="submit" disabled={saveMutation.isPending}>
                                {saveMutation.isPending ? 'Saving...' : editingId ? 'Update User' : 'Create User'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </TabsContent>
    )
}

const emptyLocationForm = { name: '', type: 'building' as string, address: '', description: '', parentId: '' }

function LocationsTab() {
    const queryClient = useQueryClient()
    const [showDialog, setShowDialog] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState(emptyLocationForm)
    const [showImport, setShowImport] = useState(false)

    const { data: locationsData, isLoading } = useQuery({
        queryKey: ['locations'],
        queryFn: async () => {
            const res = await api.getLocations()
            return res.data?.data || res.data || []
        },
    })

    const saveMutation = useMutation({
        mutationFn: (data: any) =>
            editingId ? api.updateLocation(editingId, data) : api.createLocation(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations'] })
            setShowDialog(false)
            setEditingId(null)
            setForm(emptyLocationForm)
            toast.success(editingId ? 'Location updated' : 'Location created')
        },
        onError: (error: any) => {
            const msg = error.response?.data?.message
            toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to save location')
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteLocation(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations'] })
            toast.success('Location deleted')
        },
        onError: () => toast.error('Failed to delete location'),
    })

    const locations = Array.isArray(locationsData) ? locationsData : []

    const openEdit = (loc: any) => {
        setEditingId(loc.id)
        setForm({
            name: loc.name || '',
            type: loc.type || 'building',
            address: loc.address || '',
            description: loc.description || '',
            parentId: loc.parentId || '',
        })
        setShowDialog(true)
    }

    const openCreate = () => {
        setEditingId(null)
        setForm(emptyLocationForm)
        setShowDialog(true)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const data: any = {
            name: form.name,
            type: form.type || undefined,
            address: form.address || undefined,
            description: form.description || undefined,
            parentId: form.parentId || undefined,
        }
        saveMutation.mutate(data)
    }

    const handleExportCsv = async () => {
        try {
            const res = await api.exportLocationsCsv()
            const url = URL.createObjectURL(res.data)
            const a = document.createElement('a')
            a.href = url; a.download = 'locations.csv'; a.click()
            URL.revokeObjectURL(url)
            toast.success('Locations exported')
        } catch {
            toast.error('Failed to export locations')
        }
    }

    if (isLoading) {
        return (
            <TabsContent value="locations" className="space-y-6">
                <Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                    <CardContent>{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full mb-2" />)}</CardContent>
                </Card>
            </TabsContent>
        )
    }

    return (
        <TabsContent value="locations" className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Locations</CardTitle>
                            <CardDescription>{locations.length} location(s) configured</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleExportCsv}>
                                <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
                                <Upload className="h-4 w-4 mr-2" /> Import
                            </Button>
                            <Button onClick={openCreate}>
                                <Plus className="h-4 w-4 mr-2" /> Add Location
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-b-lg overflow-hidden">
                        <div className="grid grid-cols-5 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <span className="col-span-2">Name</span>
                            <span>Type</span>
                            <span>Address</span>
                            <span>Actions</span>
                        </div>
                        <div className="divide-y">
                            {locations.length === 0 && (
                                <div className="p-6 text-center text-muted-foreground">No locations configured yet.</div>
                            )}
                            {locations.map((loc: any) => (
                                <div key={loc.id} className="grid grid-cols-5 gap-4 p-3 items-center">
                                    <div className="col-span-2 flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <MapPin className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{loc.name}</p>
                                            {loc.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{loc.description}</p>}
                                        </div>
                                    </div>
                                    <Badge variant="outline">{loc.type || 'building'}</Badge>
                                    <span className="text-sm text-muted-foreground truncate">{loc.address || '-'}</span>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(loc)}>
                                            <Edit className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => { if (confirm('Delete this location?')) deleteMutation.mutate(loc.id) }}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Location' : 'Add Location'}</DialogTitle>
                        <DialogDescription>{editingId ? 'Update location details.' : 'Add a new location to your organization.'}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={form.type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, type: e.target.value })}>
                                    <option value="building">Building</option>
                                    <option value="floor">Floor</option>
                                    <option value="room">Room</option>
                                    <option value="area">Area</option>
                                    <option value="site">Site</option>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Parent Location</Label>
                                <Select value={form.parentId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, parentId: e.target.value })}>
                                    <option value="">None (Top Level)</option>
                                    {locations.filter((l: any) => l.id !== editingId).map((l: any) => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Address</Label>
                            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={saveMutation.isPending}>
                                {saveMutation.isPending ? 'Saving...' : editingId ? 'Update Location' : 'Create Location'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <CsvImportDialog
                open={showImport}
                onOpenChange={setShowImport}
                title="Import Locations"
                onImport={(file) => api.importLocationsCsv(file)}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['locations'] })}
            />
        </TabsContent>
    )
}

const emptyCategoryForm = { name: '', description: '', parentId: '' }

function CategoriesTab() {
    const queryClient = useQueryClient()
    const [showDialog, setShowDialog] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState(emptyCategoryForm)

    const { data: categoriesData, isLoading } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await api.getCategories()
            return res.data?.data || res.data || []
        },
    })

    const saveMutation = useMutation({
        mutationFn: (data: any) =>
            editingId ? api.updateCategory(editingId, data) : api.createCategory(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
            setShowDialog(false)
            setEditingId(null)
            setForm(emptyCategoryForm)
            toast.success(editingId ? 'Category updated' : 'Category created')
        },
        onError: (error: any) => {
            const msg = error.response?.data?.message
            toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to save category')
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteCategory(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
            toast.success('Category deleted')
        },
        onError: () => toast.error('Failed to delete category'),
    })

    const categories = Array.isArray(categoriesData) ? categoriesData : []

    const openEdit = (cat: any) => {
        setEditingId(cat.id)
        setForm({
            name: cat.name || '',
            description: cat.description || '',
            parentId: cat.parentId || '',
        })
        setShowDialog(true)
    }

    const openCreate = () => {
        setEditingId(null)
        setForm(emptyCategoryForm)
        setShowDialog(true)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const data: any = {
            name: form.name,
            description: form.description || undefined,
            parentId: form.parentId || undefined,
        }
        saveMutation.mutate(data)
    }

    if (isLoading) {
        return (
            <TabsContent value="categories" className="space-y-6">
                <Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                    <CardContent>{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full mb-2" />)}</CardContent>
                </Card>
            </TabsContent>
        )
    }

    return (
        <TabsContent value="categories" className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Asset Categories</CardTitle>
                            <CardDescription>{categories.length} categor{categories.length === 1 ? 'y' : 'ies'} configured</CardDescription>
                        </div>
                        <Button onClick={openCreate}>
                            <Plus className="h-4 w-4 mr-2" /> Add Category
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-b-lg overflow-hidden">
                        <div className="grid grid-cols-4 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <span className="col-span-2">Name</span>
                            <span>Parent</span>
                            <span>Actions</span>
                        </div>
                        <div className="divide-y">
                            {categories.length === 0 && (
                                <div className="p-6 text-center text-muted-foreground">No categories configured yet.</div>
                            )}
                            {categories.map((cat: any) => {
                                const parent = categories.find((c: any) => c.id === cat.parentId)
                                return (
                                    <div key={cat.id} className="grid grid-cols-4 gap-4 p-3 items-center">
                                        <div className="col-span-2 flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                                <Tag className="h-4 w-4 text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{cat.name}</p>
                                                {cat.description && <p className="text-xs text-muted-foreground truncate max-w-[250px]">{cat.description}</p>}
                                            </div>
                                        </div>
                                        <span className="text-sm text-muted-foreground">{parent?.name || '-'}</span>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                                                <Edit className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => { if (confirm('Delete this category?')) deleteMutation.mutate(cat.id) }}
                                                disabled={deleteMutation.isPending}
                                            >
                                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Category' : 'Add Category'}</DialogTitle>
                        <DialogDescription>{editingId ? 'Update category details.' : 'Add a new asset category.'}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Parent Category</Label>
                            <Select value={form.parentId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, parentId: e.target.value })}>
                                <option value="">None (Top Level)</option>
                                {categories.filter((c: any) => c.id !== editingId).map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={saveMutation.isPending}>
                                {saveMutation.isPending ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </TabsContent>
    )
}

const ALL_PERMISSIONS = [
    { group: 'Assets', perms: ['assets:read', 'assets:write'] },
    { group: 'Work Orders', perms: ['work_orders:read', 'work_orders:write'] },
    { group: 'Work Requests', perms: ['work_requests:write'] },
    { group: 'PM Plans', perms: ['pm:read', 'pm:write'] },
    { group: 'Inventory', perms: ['inventory:read', 'inventory:write', 'inventory:delete'] },
    { group: 'Reports', perms: ['reports:read'] },
    { group: 'Users', perms: ['users:read', 'users:write'] },
    { group: 'Settings', perms: ['settings:write'] },
    { group: 'AI', perms: ['ai:read'] },
    { group: 'Billing', perms: ['billing:read', 'billing:write'] },
]

const emptyRoleForm = { name: '', description: '', permissions: [] as string[] }

function RolesTab() {
    const queryClient = useQueryClient()
    const [showDialog, setShowDialog] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState(emptyRoleForm)

    const { data: rolesData, isLoading } = useQuery({
        queryKey: ['roles'],
        queryFn: async () => {
            const res = await api.getRoles()
            return res.data?.data || res.data || []
        },
    })

    const saveMutation = useMutation({
        mutationFn: (data: any) =>
            editingId ? api.updateRole(editingId, data) : api.createRole(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] })
            setShowDialog(false)
            setEditingId(null)
            setForm(emptyRoleForm)
            toast.success(editingId ? 'Role updated' : 'Role created')
        },
        onError: (error: any) => {
            const msg = error.response?.data?.message
            toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to save role')
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteRole(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] })
            toast.success('Role deleted')
        },
        onError: () => toast.error('Failed to delete role'),
    })

    const roles = Array.isArray(rolesData) ? rolesData : []

    const openEdit = (role: any) => {
        setEditingId(role.id)
        setForm({
            name: role.name || '',
            description: role.description || '',
            permissions: role.permissions || [],
        })
        setShowDialog(true)
    }

    const openCreate = () => {
        setEditingId(null)
        setForm(emptyRoleForm)
        setShowDialog(true)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        saveMutation.mutate({
            name: form.name,
            description: form.description || undefined,
            permissions: form.permissions,
        })
    }

    const togglePermission = (perm: string) => {
        setForm(prev => ({
            ...prev,
            permissions: prev.permissions.includes(perm)
                ? prev.permissions.filter(p => p !== perm)
                : [...prev.permissions, perm],
        }))
    }

    if (isLoading) {
        return (
            <TabsContent value="roles" className="space-y-6">
                <Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                    <CardContent>{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full mb-2" />)}</CardContent>
                </Card>
            </TabsContent>
        )
    }

    return (
        <TabsContent value="roles" className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Roles & Permissions</CardTitle>
                            <CardDescription>{roles.length} role(s) configured</CardDescription>
                        </div>
                        <Button onClick={openCreate}>
                            <Plus className="h-4 w-4 mr-2" /> Add Role
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-b-lg overflow-hidden">
                        <div className="grid grid-cols-4 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <span>Name</span>
                            <span className="col-span-2">Permissions</span>
                            <span>Actions</span>
                        </div>
                        <div className="divide-y">
                            {roles.length === 0 && (
                                <div className="p-6 text-center text-muted-foreground">No roles configured yet.</div>
                            )}
                            {roles.map((role: any) => (
                                <div key={role.id} className="grid grid-cols-4 gap-4 p-3 items-center">
                                    <div>
                                        <p className="text-sm font-medium">{role.name}</p>
                                        {role.description && <p className="text-xs text-muted-foreground truncate">{role.description}</p>}
                                    </div>
                                    <div className="col-span-2 flex flex-wrap gap-1">
                                        {(role.permissions || []).slice(0, 6).map((perm: string) => (
                                            <Badge key={perm} variant="outline" className="text-xs">{perm}</Badge>
                                        ))}
                                        {(role.permissions || []).length > 6 && (
                                            <Badge variant="secondary" className="text-xs">+{role.permissions.length - 6}</Badge>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(role)}>
                                            <Edit className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => { if (confirm('Delete this role?')) deleteMutation.mutate(role.id) }}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Role' : 'Add Role'}</DialogTitle>
                        <DialogDescription>{editingId ? 'Update role details and permissions.' : 'Create a new role with specific permissions.'}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Technician, Manager" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of this role" />
                        </div>
                        <div className="space-y-3">
                            <Label>Permissions</Label>
                            {ALL_PERMISSIONS.map(group => (
                                <div key={group.group} className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">{group.group}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {group.perms.map(perm => (
                                            <button
                                                key={perm}
                                                type="button"
                                                onClick={() => togglePermission(perm)}
                                                className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                                                    form.permissions.includes(perm)
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'bg-background hover:bg-muted border-border'
                                                }`}
                                            >
                                                {perm.split(':')[1]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={saveMutation.isPending}>
                                {saveMutation.isPending ? 'Saving...' : editingId ? 'Update Role' : 'Create Role'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </TabsContent>
    )
}

function BillingTab() {
    const queryClient = useQueryClient()

    const { data: subscription, isLoading } = useQuery({
        queryKey: ['subscription'],
        queryFn: async () => {
            const res = await api.getSubscription()
            return res.data
        },
    })

    const { data: invoices } = useQuery({
        queryKey: ['invoices'],
        queryFn: async () => {
            const res = await api.getInvoices(10)
            return res.data
        },
    })

    const [showCancelDialog, setShowCancelDialog] = useState(false)

    const cancelMutation = useMutation({
        mutationFn: () => api.cancelSubscription(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subscription'] })
            toast.success('Subscription will be cancelled at the end of the billing period')
            setShowCancelDialog(false)
        },
        onError: () => toast.error('Failed to cancel subscription'),
    })

    const handleUpgrade = async (plan: string) => {
        try {
            const res = await api.createCheckoutSession({
                plan,
                successUrl: window.location.href,
                cancelUrl: window.location.href,
            })
            window.location.href = res.data.url
        } catch {
            toast.error('Failed to start checkout')
        }
    }

    const handleManageBilling = async () => {
        try {
            const res = await api.createBillingPortal({ returnUrl: window.location.href })
            window.location.href = res.data.url
        } catch {
            toast.error('Failed to open billing portal')
        }
    }

    const statusColors: Record<string, string> = {
        active: 'bg-green-500/10 text-green-700 border-green-500/20',
        trialing: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
        past_due: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
        canceled: 'bg-red-500/10 text-red-700 border-red-500/20',
    }

    const plans = [
        { id: 'free', name: 'Free', price: '$0', period: '/month', features: ['5 assets', '2 users', 'Basic work orders', 'Email support'] },
        { id: 'pro', name: 'Pro', price: '$49', period: '/month', features: ['Unlimited assets', '10 users', 'PM scheduling', 'Inventory management', 'Reports', 'Priority support'] },
        { id: 'enterprise', name: 'Enterprise', price: '$149', period: '/month', features: ['Unlimited everything', 'Unlimited users', 'AI assistant', 'Custom integrations', 'SSO & audit logs', 'Dedicated support'] },
    ]

    if (isLoading) {
        return (
            <TabsContent value="billing" className="space-y-6">
                <Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                    <CardContent><Skeleton className="h-32 w-full" /></CardContent>
                </Card>
            </TabsContent>
        )
    }

    const currentPlan = subscription?.plan || 'free'
    const status = subscription?.status || 'active'

    return (
        <TabsContent value="billing" className="space-y-6">
            {/* Current Plan */}
            <Card>
                <CardHeader>
                    <CardTitle>Current Plan</CardTitle>
                    <CardDescription>Your subscription details and billing information.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div>
                                <span className="text-2xl font-bold capitalize">{currentPlan}</span>
                                <Badge className={`ml-3 ${statusColors[status] || 'bg-gray-500/10 text-gray-700'}`}>
                                    {status.replace('_', ' ')}
                                </Badge>
                            </div>
                        </div>
                        <Button variant="outline" onClick={handleManageBilling}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Manage Billing
                        </Button>
                    </div>
                    {subscription?.currentPeriodEnd && (
                        <p className="text-sm text-muted-foreground mt-2">
                            {subscription.cancelAtPeriodEnd
                                ? `Cancels on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                                : `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                            }
                        </p>
                    )}
                    {subscription?.cancelAtPeriodEnd && (
                        <p className="text-sm text-amber-600 mt-1 font-medium">
                            Your subscription is set to cancel at the end of the current billing period.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Plan Comparison */}
            <div className="grid gap-4 md:grid-cols-3">
                {plans.map((plan) => (
                    <Card key={plan.id} className={currentPlan === plan.id ? 'ring-2 ring-primary' : ''}>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                {plan.name}
                                {currentPlan === plan.id && (
                                    <Badge variant="default" className="text-xs">Current</Badge>
                                )}
                            </CardTitle>
                            <div>
                                <span className="text-3xl font-bold">{plan.price}</span>
                                <span className="text-muted-foreground">{plan.period}</span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ul className="space-y-2">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-2 text-sm">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            {currentPlan !== plan.id && plan.id !== 'free' && (
                                <Button className="w-full" onClick={() => handleUpgrade(plan.id)}>
                                    {plans.findIndex(p => p.id === currentPlan) < plans.findIndex(p => p.id === plan.id) ? 'Upgrade' : 'Switch'} to {plan.name}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Cancel Subscription */}
            {currentPlan !== 'free' && !subscription?.cancelAtPeriodEnd && (
                <Card>
                    <CardContent className="flex items-center justify-between py-4">
                        <div>
                            <p className="font-medium">Cancel Subscription</p>
                            <p className="text-sm text-muted-foreground">Your access will continue until the end of the billing period.</p>
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => setShowCancelDialog(true)}>
                            Cancel Plan
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Invoice History */}
            {Array.isArray(invoices) && invoices.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Invoice History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="text-left p-3 font-medium">Date</th>
                                        <th className="text-left p-3 font-medium">Amount</th>
                                        <th className="text-left p-3 font-medium">Status</th>
                                        <th className="text-right p-3 font-medium">Invoice</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((inv: any) => (
                                        <tr key={inv.id} className="border-b last:border-0">
                                            <td className="p-3">{inv.created ? new Date(inv.created * 1000).toLocaleDateString() : '—'}</td>
                                            <td className="p-3 font-medium">{inv.amount_due != null ? `$${(inv.amount_due / 100).toFixed(2)}` : '—'}</td>
                                            <td className="p-3">
                                                <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'} className="text-xs capitalize">
                                                    {inv.status || 'unknown'}
                                                </Badge>
                                            </td>
                                            <td className="p-3 text-right">
                                                {inv.invoice_pdf && (
                                                    <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                                                        Download PDF
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Cancel Confirmation Dialog */}
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Subscription</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to cancel? Your subscription will remain active until the end of the current billing period.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowCancelDialog(false)}>Keep Subscription</Button>
                        <Button variant="destructive" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
                            {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TabsContent>
    )
}

const colorThemeOptions = [
    { value: 'default' as const, label: 'Neutral', color: '#171717' },
    { value: 'blue' as const, label: 'Blue', color: '#2563eb' },
    { value: 'green' as const, label: 'Green', color: '#16a34a' },
    { value: 'orange' as const, label: 'Orange', color: '#ea580c' },
    { value: 'rose' as const, label: 'Rose', color: '#e11d48' },
    { value: 'violet' as const, label: 'Violet', color: '#7c3aed' },
]

function AppearanceTab() {
    const { colorTheme, setColorTheme } = useColorTheme()
    const { setTheme, theme } = useTheme()

    return (
        <TabsContent value="appearance" className="space-y-6">
            {/* Mode */}
            <Card>
                <CardHeader>
                    <CardTitle>Mode</CardTitle>
                    <CardDescription>
                        Choose between light, dark, or system-matched mode.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4 max-w-md">
                        {[
                            { value: 'light', label: 'Light', icon: Sun },
                            { value: 'dark', label: 'Dark', icon: Moon },
                            { value: 'system', label: 'System', icon: Monitor },
                        ].map((mode) => (
                            <button
                                key={mode.value}
                                onClick={() => setTheme(mode.value)}
                                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                                    theme === mode.value
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50'
                                }`}
                            >
                                <mode.icon className="h-6 w-6" />
                                <span className="text-sm font-medium">{mode.label}</span>
                                {theme === mode.value && (
                                    <Check className="h-4 w-4 text-primary" />
                                )}
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Color Theme */}
            <Card>
                <CardHeader>
                    <CardTitle>Color Theme</CardTitle>
                    <CardDescription>
                        Select a color palette for the entire application.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                        {colorThemeOptions.map((ct) => (
                            <button
                                key={ct.value}
                                onClick={() => setColorTheme(ct.value)}
                                className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                                    colorTheme === ct.value
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50'
                                }`}
                            >
                                <div
                                    className="h-10 w-10 rounded-full border shadow-sm"
                                    style={{ backgroundColor: ct.color }}
                                />
                                <span className="text-sm font-medium">{ct.label}</span>
                                {colorTheme === ct.value && (
                                    <Check className="h-4 w-4 text-primary" />
                                )}
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
    )
}
