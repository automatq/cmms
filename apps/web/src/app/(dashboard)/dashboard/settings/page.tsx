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
import { Settings, Building2, User, Bell, Shield, Smartphone, Zap } from 'lucide-react'

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

    const handleToggleModule = (moduleId: string, enabled: boolean) => {
        const updatedModules = {
            ...organization?.modules,
            [moduleId]: enabled,
        }
        updateOrgMutation.mutate({ modules: updatedModules })
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your organization settings and preferences.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 md:w-auto md:grid-cols-4 gap-2">
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
                                    <p className="text-sm text-muted-foreground">Manage PM plans and automated generation.</p>
                                </div>
                                <Switch
                                    checked={organization?.modules?.preventiveMaintenance}
                                    onCheckedChange={(checked) => handleToggleModule('preventiveMaintenance', checked)}
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                                <div className="flex flex-col space-y-1">
                                    <Label>Inventory Management</Label>
                                    <p className="text-sm text-muted-foreground">Track parts, stock levels, and purchase orders.</p>
                                </div>
                                <Switch
                                    checked={organization?.modules?.inventory}
                                    onCheckedChange={(checked) => handleToggleModule('inventory', checked)}
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                                <div className="flex flex-col space-y-1">
                                    <Label>AI Assistant</Label>
                                    <p className="text-sm text-muted-foreground">Use AI for troubleshooting and insights.</p>
                                </div>
                                <Switch
                                    checked={organization?.modules?.aiAssistant}
                                    onCheckedChange={(checked) => handleToggleModule('aiAssistant', checked)}
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                                <div className="flex flex-col space-y-1">
                                    <Label>Work Requests Portal</Label>
                                    <p className="text-sm text-muted-foreground">Allow external users to submit work requests.</p>
                                </div>
                                <Switch
                                    checked={organization?.modules?.workRequestsPortal}
                                    onCheckedChange={(checked) => handleToggleModule('workRequestsPortal', checked)}
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

                <TabsContent value="notifications" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notification Preferences</CardTitle>
                            <CardDescription>
                                Manage how and when you receive notifications.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Notification settings are coming soon.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
