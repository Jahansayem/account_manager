'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { IconType } from '@/lib/types/enums'
import { ArrowLeft, Palette, Type, Image, Link as LinkIcon, Tag } from 'lucide-react'
import Link from 'next/link'

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
  '#14b8a6', '#eab308', '#dc2626', '#7c3aed', '#0891b2',
]

export default function CreatePlatformPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    iconType: IconType.EMOJI,
    iconValue: '🌐',
    color: '#3b82f6',
    isActive: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Platform name is required'
    }

    if (!formData.iconValue.trim()) {
      newErrors.iconValue = 'Icon value is required'
    }

    if (formData.iconType === IconType.URL && !isValidUrl(formData.iconValue)) {
      newErrors.iconValue = 'Please enter a valid URL'
    }

    if (!formData.color || !isValidHexColor(formData.color)) {
      newErrors.color = 'Please enter a valid hex color'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidUrl = (string: string) => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  const isValidHexColor = (color: string) => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('platforms')
        .insert({
          name: formData.name,
          description: formData.description || null,
          icon_type: formData.iconType,
          icon_data: formData.iconValue,
          color_hex: formData.color,
          is_active: formData.isActive,
          user_id: user?.id,
        })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      router.push('/platforms')
    } catch (error: unknown) {
      console.error('Error creating platform:', error)
      setErrors({ submit: (error as Error).message || 'Failed to create platform. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const getIconPreview = () => {
    switch (formData.iconType) {
      case IconType.EMOJI:
        return <span className="text-2xl">{formData.iconValue}</span>
      case IconType.TEXT:
        return <span className="text-lg font-bold text-white">{formData.iconValue}</span>
      case IconType.URL:
        return isValidUrl(formData.iconValue) ? (
          <img src={formData.iconValue} alt="Icon preview" className="w-8 h-8 rounded" />
        ) : (
          <span className="text-xs text-white">Invalid URL</span>
        )
      default:
        return <span className="text-xs font-bold text-white">{formData.name.slice(0, 2).toUpperCase()}</span>
    }
  }

  const getIconPlaceholder = () => {
    switch (formData.iconType) {
      case IconType.EMOJI:
        return 'e.g., 🌐, 📱, 💻'
      case IconType.TEXT:
        return 'e.g., YT, FB, TW'
      case IconType.URL:
        return 'https://example.com/icon.png'
      default:
        return 'Icon value'
    }
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
            <h1 className="text-3xl font-bold text-gray-900">Create New Platform</h1>
            <p className="text-gray-600 mt-2">Add a new platform for your subscription accounts.</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
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
                        <Tag className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
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
                      <Textarea
                        id="description"
                        placeholder="Enter platform description (optional)"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={3}
                      />
                    </div>

                    {/* Icon Configuration */}
                    <div className="space-y-4">
                      <Label>Icon Configuration</Label>
                      
                      {/* Icon Type */}
                      <div className="space-y-2">
                        <Label htmlFor="iconType">Icon Type</Label>
                        <select
                          id="iconType"
                          value={formData.iconType}
                          onChange={(e) => handleInputChange('iconType', e.target.value as IconType)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value={IconType.EMOJI}>Emoji</option>
                          <option value={IconType.TEXT}>Text</option>
                          <option value={IconType.URL}>Image URL</option>
                          <option value={IconType.IMAGE}>Image Upload (Not implemented)</option>
                        </select>
                      </div>

                      {/* Icon Value */}
                      <div className="space-y-2">
                        <Label htmlFor="iconValue">Icon Value *</Label>
                        <Input
                          id="iconValue"
                          type="text"
                          placeholder={getIconPlaceholder()}
                          value={formData.iconValue}
                          onChange={(e) => handleInputChange('iconValue', e.target.value)}
                        />
                        {errors.iconValue && <p className="text-sm text-red-600">{errors.iconValue}</p>}
                      </div>
                    </div>

                    {/* Color Selection */}
                    <div className="space-y-4">
                      <Label>Platform Color</Label>
                      
                      {/* Preset Colors */}
                      <div className="grid grid-cols-8 gap-2">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-10 h-10 rounded-lg border-2 hover:scale-110 transition-transform ${
                              formData.color === color ? 'border-gray-800 ring-2 ring-gray-300' : 'border-gray-200'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => handleInputChange('color', color)}
                          />
                        ))}
                      </div>

                      {/* Custom Color Input */}
                      <div className="space-y-2">
                        <Label htmlFor="color">Custom Color (Hex)</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="color"
                            type="text"
                            placeholder="#3b82f6"
                            value={formData.color}
                            onChange={(e) => handleInputChange('color', e.target.value)}
                            className="flex-1"
                          />
                          <div 
                            className="w-12 h-10 rounded border"
                            style={{ backgroundColor: isValidHexColor(formData.color) ? formData.color : '#gray' }}
                          />
                        </div>
                        {errors.color && <p className="text-sm text-red-600">{errors.color}</p>}
                      </div>
                    </div>


                    {/* Active Status */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => handleInputChange('isActive', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="isActive">Platform is active</Label>
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
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Platform'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Preview Card */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Palette className="w-5 w-5 mr-2" />
                    Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-4 border rounded-lg bg-white">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: isValidHexColor(formData.color) ? formData.color : '#gray' }}
                      >
                        {getIconPreview()}
                      </div>
                      <div>
                        <p className="font-semibold">{formData.name || 'Platform Name'}</p>
                        {formData.description && (
                          <p className="text-sm text-gray-500">{formData.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Type:</span>
                        <span className="capitalize">{formData.iconType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <span className={formData.isActive ? 'text-green-600' : 'text-gray-500'}>
                          {formData.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}