'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PageHeader } from '@/components/ui/page-header'
import { Plus, Users, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

export default function TeamsPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newTeam, setNewTeam] = useState({ name: '', description: '' })

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.getTeams().then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createTeam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      setShowCreate(false)
      setNewTeam({ name: '', description: '' })
      toast.success('Team created')
    },
    onError: () => toast.error('Failed to create team'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Team deleted')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        description="Manage maintenance crews and teams"
        actions={
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New Team</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Team</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (newTeam.name) createMutation.mutate(newTeam)
                }}
              >
                <Input
                  placeholder="Team name"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                />
                <Input
                  placeholder="Description (optional)"
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!newTeam.name || createMutation.isPending}
                >
                  Create Team
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-32" /></Card>
          ))}
        </div>
      ) : !teams?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No teams yet</p>
            <p className="text-sm text-muted-foreground">Create your first maintenance team to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team: any) => (
            <Card key={team.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{team.name}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(team.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardHeader>
              <CardContent>
                {team.description && (
                  <p className="text-sm text-muted-foreground mb-3">{team.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{team.members?.length || 0} members</span>
                </div>
                {team.leader && (
                  <Badge variant="secondary" className="mt-2">Lead: {team.leader.firstName || team.leader.email}</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
