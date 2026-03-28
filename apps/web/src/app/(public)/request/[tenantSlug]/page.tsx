'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Wrench, CheckCircle, Search } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

export default function PublicRequestPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const [form, setForm] = useState({
    title: '',
    description: '',
    submitterName: '',
    submitterEmail: '',
    location: '',
    priority: 'medium',
  })
  const [submitted, setSubmitted] = useState(false)
  const [trackingToken, setTrackingToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Track status
  const [trackInput, setTrackInput] = useState('')
  const [trackResult, setTrackResult] = useState<any>(null)
  const [trackMode, setTrackMode] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/public/${tenantSlug}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to submit request')
      }
      const data = await res.json()
      setTrackingToken(data.trackingToken)
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  const handleTrack = async () => {
    setError('')
    try {
      const res = await fetch(
        `${API_URL}/public/${tenantSlug}/requests/${trackInput}/status`
      )
      if (!res.ok) throw new Error('Request not found')
      const data = await res.json()
      setTrackResult(data)
    } catch (err: any) {
      setError(err.message || 'Could not find request')
      setTrackResult(null)
    }
  }

  if (submitted) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle className="h-16 w-16 text-green-600" />
            <h2 className="mt-4 text-2xl font-bold">Request Submitted</h2>
            <p className="mt-2 text-muted-foreground text-center">
              Your maintenance request has been submitted successfully.
            </p>
            <div className="mt-6 p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                Your tracking number
              </p>
              <p className="text-xl font-mono font-bold mt-1">
                {trackingToken}
              </p>
            </div>
            <p className="mt-4 text-sm text-muted-foreground text-center">
              Save this number to check the status of your request later.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => {
                setSubmitted(false)
                setForm({
                  title: '',
                  description: '',
                  submitterName: '',
                  submitterEmail: '',
                  location: '',
                  priority: 'medium',
                })
              }}
            >
              Submit Another Request
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-lg px-4 py-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Maintenance Request</h1>
        <p className="text-muted-foreground mt-2">
          Submit a maintenance request or check the status of an existing one
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <Button
          variant={trackMode ? 'outline' : 'default'}
          className="flex-1"
          onClick={() => setTrackMode(false)}
        >
          New Request
        </Button>
        <Button
          variant={trackMode ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => setTrackMode(true)}
        >
          Track Request
        </Button>
      </div>

      {trackMode ? (
        <Card>
          <CardHeader>
            <CardTitle>Track Your Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter tracking number"
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value)}
              />
              <Button onClick={handleTrack} disabled={!trackInput}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {trackResult && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">
                    {trackResult.status?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Title</span>
                  <span className="font-medium">{trackResult.title}</span>
                </div>
                {trackResult.submittedAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Submitted
                    </span>
                    <span className="font-medium">
                      {new Date(trackResult.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Submit a Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Your Name</label>
              <Input
                placeholder="John Doe"
                value={form.submitterName}
                onChange={(e) =>
                  setForm({ ...form, submitterName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={form.submitterEmail}
                onChange={(e) =>
                  setForm({ ...form, submitterEmail: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                What needs attention?
              </label>
              <Input
                placeholder="e.g. Broken AC in Room 204"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full rounded-md border border-input px-3 py-2 text-sm min-h-[100px]"
                placeholder="Provide details about the issue..."
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <Input
                placeholder="Building, floor, room..."
                value={form.location}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <select
                className="w-full rounded-md border border-input px-3 py-2 text-sm"
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.target.value })
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={
                !form.title || !form.submitterName || loading
              }
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
