'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Library,
  ClipboardList,
  Download,
  Eye,
  Camera,
  Gauge,
  CheckCircle,
  Plus,
  Trash2,
  GripVertical,
  Edit,
  Sparkles,
} from 'lucide-react'

const CATEGORY_COLORS: Record<string, string> = {
  HVAC: 'bg-blue-100 text-blue-700',
  Electrical: 'bg-yellow-100 text-yellow-700',
  Pumps: 'bg-cyan-100 text-cyan-700',
  'Fire Safety': 'bg-red-100 text-red-700',
  Conveyor: 'bg-orange-100 text-orange-700',
  Vehicle: 'bg-green-100 text-green-700',
  General: 'bg-gray-100 text-gray-700',
}

interface TemplateItem {
  step: number
  instruction: string
  requiresPhoto?: boolean
  requiresValue?: boolean
  unit?: string
  passFail?: boolean
}

interface LibraryTemplate {
  name: string
  description: string
  category: string
  items: TemplateItem[]
}

const emptyStep = { step: 1, instruction: '', requiresPhoto: false, requiresValue: false, unit: '', passFail: false }

export default function PmTemplatesPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('library')
  const [previewTemplate, setPreviewTemplate] = useState<{ template: LibraryTemplate | any; index?: number } | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editorForm, setEditorForm] = useState({ name: '', description: '', category: '', items: [{ ...emptyStep }] })
  const [aiOpen, setAiOpen] = useState(false)
  const [aiForm, setAiForm] = useState({ description: '', category: '' })

  const { data: libraryTemplates = [], isLoading: isLibraryLoading } = useQuery({
    queryKey: ['library-templates'],
    queryFn: async () => {
      const res = await api.getLibraryTemplates()
      return res.data as LibraryTemplate[]
    },
  })

  const { data: myTemplates = [], isLoading: isMyLoading } = useQuery({
    queryKey: ['checklist-templates'],
    queryFn: async () => {
      const res = await api.getChecklistTemplates()
      return res.data
    },
  })

  const importMutation = useMutation({
    mutationFn: (index: number) => api.importLibraryTemplate(index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] })
      toast.success('Template imported to your account')
      setPreviewTemplate(null)
    },
    onError: () => {
      toast.error('Failed to import template')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteChecklistTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] })
      toast.success('Template deleted')
    },
    onError: () => {
      toast.error('Failed to delete template')
    },
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editingId ? api.updateChecklistTemplate(editingId, data) : api.createChecklistTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] })
      setShowEditor(false)
      setEditingId(null)
      toast.success(editingId ? 'Template updated' : 'Template created')
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to save template')
    },
  })

  const openCreateEditor = () => {
    setEditingId(null)
    setEditorForm({ name: '', description: '', category: '', items: [{ ...emptyStep }] })
    setShowEditor(true)
  }

  // Generate a draft with AI, then open the editor prefilled for review/save.
  const generateMutation = useMutation({
    mutationFn: (data: { description: string; category?: string }) => api.aiGenerateChecklist(data),
    onSuccess: (res) => {
      const draft = res.data
      setEditingId(null)
      setEditorForm({
        name: draft.name || '',
        description: draft.description || '',
        category: draft.category || aiForm.category || '',
        items:
          draft.items?.length > 0
            ? draft.items.map((it: any, i: number) => ({
                step: i + 1,
                instruction: it.instruction || '',
                requiresPhoto: !!it.requiresPhoto,
                requiresValue: !!it.requiresValue,
                unit: it.unit || '',
                passFail: !!it.passFail,
              }))
            : [{ ...emptyStep }],
      })
      setAiOpen(false)
      setShowEditor(true)
      toast.success('Draft generated — review and save')
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to generate checklist')
    },
  })

  const openEditEditor = (template: any) => {
    setEditingId(template.id)
    setEditorForm({
      name: template.name || '',
      description: template.description || '',
      category: template.category || '',
      items: template.items?.length > 0 ? template.items.map((item: any, i: number) => ({
        step: item.step || i + 1,
        instruction: item.instruction || '',
        requiresPhoto: item.requiresPhoto || false,
        requiresValue: item.requiresValue || false,
        unit: item.unit || '',
        passFail: item.passFail || false,
      })) : [{ ...emptyStep }],
    })
    setShowEditor(true)
    setPreviewTemplate(null)
  }

  const addStep = () => {
    setEditorForm(prev => ({
      ...prev,
      items: [...prev.items, { ...emptyStep, step: prev.items.length + 1 }],
    }))
  }

  const removeStep = (idx: number) => {
    setEditorForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx).map((item, i) => ({ ...item, step: i + 1 })),
    }))
  }

  const updateStep = (idx: number, field: string, value: any) => {
    setEditorForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === idx ? { ...item, [field]: value } : item),
    }))
  }

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault()
    const validItems = editorForm.items.filter(item => item.instruction.trim())
    if (validItems.length === 0) {
      toast.error('Add at least one step')
      return
    }
    saveMutation.mutate({
      name: editorForm.name,
      description: editorForm.description || undefined,
      category: editorForm.category || undefined,
      items: validItems.map((item, i) => ({
        step: i + 1,
        instruction: item.instruction,
        requiresPhoto: item.requiresPhoto || undefined,
        requiresValue: item.requiresValue || undefined,
        unit: item.requiresValue && item.unit ? item.unit : undefined,
        passFail: item.passFail || undefined,
      })),
    })
  }

  const categories = Array.from(new Set(libraryTemplates.map((t) => t.category)))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/pm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              PM Plans
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Checklist Templates</h1>
            <p className="text-muted-foreground">
              Browse pre-built templates or manage your own
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setAiForm({ description: '', category: '' }); setAiOpen(true) }}>
            <Sparkles className="h-4 w-4 mr-2" /> Generate with AI
          </Button>
          <Button onClick={openCreateEditor}>
            <Plus className="h-4 w-4 mr-2" /> Create Template
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="library" className="gap-2">
            <Library className="h-4 w-4" />
            Template Library
          </TabsTrigger>
          <TabsTrigger value="my-templates" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            My Templates ({myTemplates.length})
          </TabsTrigger>
        </TabsList>

        {/* Library Tab */}
        <TabsContent value="library" className="space-y-8 mt-6">
          {isLibraryLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-[180px] w-full rounded-xl" />
              ))}
            </div>
          ) : (
            categories.map((category) => (
              <div key={category} className="space-y-3">
                <h2 className="text-lg font-semibold">{category}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {libraryTemplates
                    .map((t, idx) => ({ ...t, _index: idx }))
                    .filter((t) => t.category === category)
                    .map((template) => (
                      <Card
                        key={template._index}
                        className="hover:border-primary transition-colors cursor-pointer"
                        onClick={() => setPreviewTemplate({ template, index: template._index })}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base leading-tight">{template.name}</CardTitle>
                            <Badge variant="secondary" className={CATEGORY_COLORS[template.category] || ''}>
                              {template.category}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {template.description}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{template.items.length} steps</span>
                            {template.items.some((i) => i.requiresPhoto) && (
                              <span className="flex items-center gap-1">
                                <Camera className="h-3 w-3" />
                                Photos
                              </span>
                            )}
                            {template.items.some((i) => i.requiresValue) && (
                              <span className="flex items-center gap-1">
                                <Gauge className="h-3 w-3" />
                                Readings
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* My Templates Tab */}
        <TabsContent value="my-templates" className="space-y-4 mt-6">
          {isMyLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-[160px] w-full rounded-xl" />
              ))}
            </div>
          ) : myTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No templates yet</h3>
                <p className="text-muted-foreground mb-4 text-center max-w-sm">
                  Create your own or import templates from the library.
                </p>
                <div className="flex gap-2">
                  <Button onClick={openCreateEditor}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab('library')}>
                    <Library className="h-4 w-4 mr-2" />
                    Browse Library
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myTemplates.map((template: any) => (
                <Card
                  key={template.id}
                  className="hover:border-primary transition-colors cursor-pointer"
                  onClick={() => setPreviewTemplate({ template })}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">{template.name}</CardTitle>
                      {template.category && (
                        <Badge variant="secondary" className={CATEGORY_COLORS[template.category] || ''}>
                          {template.category}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {template.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {template.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{template.items?.length || 0} steps</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {previewTemplate && (
            <>
              <DialogHeader>
                <DialogTitle>{previewTemplate.template.name}</DialogTitle>
                <DialogDescription>{previewTemplate.template.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 mt-4">
                {previewTemplate.template.items?.map((item: TemplateItem) => (
                  <div
                    key={item.step}
                    className="flex items-start gap-3 p-2 rounded-lg bg-muted/50"
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                      {item.step}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{item.instruction}</p>
                      <div className="flex gap-2 mt-1">
                        {item.passFail && (
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Pass/Fail
                          </Badge>
                        )}
                        {item.requiresPhoto && (
                          <Badge variant="outline" className="text-xs">
                            <Camera className="h-3 w-3 mr-1" />
                            Photo
                          </Badge>
                        )}
                        {item.requiresValue && (
                          <Badge variant="outline" className="text-xs">
                            <Gauge className="h-3 w-3 mr-1" />
                            {item.unit || 'Value'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter className="mt-4">
                {previewTemplate.index !== undefined ? (
                  <Button
                    onClick={() => importMutation.mutate(previewTemplate.index!)}
                    disabled={importMutation.isPending}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {importMutation.isPending ? 'Importing...' : 'Import to My Templates'}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => openEditEditor(previewTemplate.template)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        deleteMutation.mutate(previewTemplate.template.id)
                        setPreviewTemplate(null)
                      }}
                    >
                      Delete Template
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Generate with AI Dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate checklist with AI</DialogTitle>
            <DialogDescription>
              Paste a manual excerpt or describe the equipment and task. We'll draft a checklist for you to review and save.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!aiForm.description.trim()) {
                toast.error('Add a description or manual excerpt')
                return
              }
              generateMutation.mutate({
                description: aiForm.description,
                category: aiForm.category || undefined,
              })
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Category (optional)</Label>
              <Input
                value={aiForm.category}
                onChange={(e) => setAiForm({ ...aiForm, category: e.target.value })}
                placeholder="e.g. HVAC, Pumps, Electrical"
              />
            </div>
            <div className="space-y-2">
              <Label>Description / manual excerpt *</Label>
              <Textarea
                value={aiForm.description}
                onChange={(e) => setAiForm({ ...aiForm, description: e.target.value })}
                placeholder="e.g. Monthly inspection for a centrifugal pump: check seals, bearings, vibration, lubrication…"
                className="min-h-[140px]"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAiOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={generateMutation.isPending}>
                <Sparkles className="h-4 w-4 mr-2" />
                {generateMutation.isPending ? 'Generating…' : 'Generate draft'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Template Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update this checklist template.' : 'Build a custom checklist template for your maintenance procedures.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTemplate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={editorForm.name}
                  onChange={(e) => setEditorForm({ ...editorForm, name: e.target.value })}
                  placeholder="e.g. HVAC Monthly Inspection"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={editorForm.category}
                  onChange={(e) => setEditorForm({ ...editorForm, category: e.target.value })}
                  placeholder="e.g. HVAC, Electrical, General"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editorForm.description}
                onChange={(e) => setEditorForm({ ...editorForm, description: e.target.value })}
                placeholder="Brief description of this checklist"
                className="min-h-[60px]"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Steps</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Step
                </Button>
              </div>
              {editorForm.items.map((item, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium mt-1">
                      {idx + 1}
                    </span>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={item.instruction}
                        onChange={(e) => updateStep(idx, 'instruction', e.target.value)}
                        placeholder="Step instruction..."
                      />
                      <div className="flex flex-wrap gap-3 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.passFail}
                            onChange={(e) => updateStep(idx, 'passFail', e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-primary"
                          />
                          Pass/Fail
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.requiresPhoto}
                            onChange={(e) => updateStep(idx, 'requiresPhoto', e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-primary"
                          />
                          Requires Photo
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.requiresValue}
                            onChange={(e) => updateStep(idx, 'requiresValue', e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-primary"
                          />
                          Requires Value
                        </label>
                        {item.requiresValue && (
                          <Input
                            value={item.unit}
                            onChange={(e) => updateStep(idx, 'unit', e.target.value)}
                            placeholder="Unit (e.g. PSI, °F)"
                            className="h-7 w-24 text-xs"
                          />
                        )}
                      </div>
                    </div>
                    {editorForm.items.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeStep(idx)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingId ? 'Update Template' : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
