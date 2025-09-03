'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { PlatformEntity } from '@/lib/types/entities'
import { ArrowLeft, Globe, FileText, Palette, Tag, Hash } from 'lucide-react'
import Link from 'next/link'

export default function EditPlatformPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const platformId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [platform, setPlatform] = useState<PlatformEntity | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    iconType: 'icon',
    iconValue: '',
    color: '#3B82F6',
    isActive: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (platformId) {
      fetchPlatform()
    }
  }, [platformId])

  const fetchPlatform = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .eq('id', platformId)
        .single()

      if (error) throw error
      if (!data) throw new Error('Platform not found')

      const platformData: PlatformEntity = {
        id: data.id,
        name: data.name,
        description: data.description,
        iconType: data.icon_type,
        iconValue: data.icon_data,
        color: data.color_hex,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      }

      setPlatform(platformData)
      setFormData({
        name: platformData.name,
        description: platformData.description || '',
        iconType: platformData.iconType,
        iconValue: platformData.iconValue || '',
        color: platformData.color || '#3B82F6',
        isActive: platformData.isActive,
      })
    } catch (error) {
      console.error('Error fetching platform:', error)
      router.push('/platforms')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Platform name is required'
    }

    if (formData.iconType === 'icon' && !formData.iconValue.trim()) {
      newErrors.iconValue = 'Icon value is required when using icon type'
    }

    if (!formData.color.match(/^#[0-9A-F]{6}$/i)) {
      newErrors.color = 'Color must be a valid hex color (e.g., #3B82F6)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !user || !platform) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('platforms')
        .update({
          name: formData.name,
          description: formData.description || null,
          icon_type: formData.iconType,
          icon_data: formData.iconValue || null,
          color_hex: formData.color,
          is_active: formData.isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', platformId)

      if (error) throw error

      router.push('/platforms')
    } catch (error) {
      console.error('Error updating platform:', error)
      setErrors({ submit: 'Failed to update platform. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!platform) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500">Platform not found</p>
            <Link href="/platforms">
              <Button className="mt-4">Back to Platforms</Button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link href="/platforms">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Platforms
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Edit Platform</h1>
            <p className="text-gray-600 mt-2">
              Update platform details and configuration
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Platform Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Platform Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Platform Name *</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter platform name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Textarea
                      id="description"
                      placeholder="Enter platform description (optional)"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="pl-9"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Icon Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="iconType">Icon Type</Label>
                    <select
                      id="iconType"
                      value={formData.iconType}
                      onChange={(e) => handleInputChange('iconType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="icon">Icon</option>
                      <option value="emoji">Emoji</option>
                      <option value="image">Image URL</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="iconValue">
                      {formData.iconType === 'icon' ? 'Icon Name' : 
                       formData.iconType === 'emoji' ? 'Emoji' : 'Image URL'}
                      {formData.iconType === 'icon' ? ' *' : ''}
                    </Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="iconValue"
                        type="text"
                        placeholder={
                          formData.iconType === 'icon' ? 'e.g., globe, mail, phone' :
                          formData.iconType === 'emoji' ? 'e.g., 🌐, 📧, 📱' :
                          'https://example.com/icon.png'
                        }
                        value={formData.iconValue}
                        onChange={(e) => handleInputChange('iconValue', e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {errors.iconValue && <p className="text-sm text-red-600">{errors.iconValue}</p>}
                  </div>
                </div>

                {/* Color and Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Palette className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="color"
                          type="text"
                          placeholder="#3B82F6"
                          value={formData.color}
                          onChange={(e) => handleInputChange('color', e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <div
                        className="w-10 h-10 rounded border border-gray-300"
                        style={{ backgroundColor: formData.color }}
                      />
                      <Input
                        type="color"
                        value={formData.color}
                        onChange={(e) => handleInputChange('color', e.target.value)}
                        className="w-10 h-10 p-0 border-0"
                      />
                    </div>
                    {errors.color && <p className="text-sm text-red-600">{errors.color}</p>}
                  </div>

                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => handleInputChange('isActive', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="isActive" className="text-sm font-normal">
                      Platform is active and can be used for new accounts
                    </Label>
                  </div>
                </div>

                {errors.submit && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    {errors.submit}
                  </div>
                )}

                <div className="flex justify-end space-x-4">
                  <Link href="/platforms">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Platform Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 p-4 border rounded-lg">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: formData.color }}
                >
                  {formData.iconType === 'emoji' ? formData.iconValue : 
                   formData.iconType === 'image' ? '🖼️' :
                   formData.iconValue.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="font-semibold">{formData.name || 'Platform Name'}</h3>
                  {formData.description && (
                    <p className="text-sm text-gray-600">{formData.description}</p>
                  )}
                  {formData.category && (
                    <p className="text-xs text-gray-500">{formData.category}</p>
                  )}
                </div>
                <div className="ml-auto">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    formData.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}