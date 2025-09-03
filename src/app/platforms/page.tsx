'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { PlatformEntity } from '@/lib/types/entities'
import { IconType } from '@/lib/types/enums'
import { ArrowLeft, Plus, Search, Edit, Trash2, Palette, Type, Image, Link as LinkIcon } from 'lucide-react'
import Link from 'next/link'

export default function PlatformsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [platforms, setPlatforms] = useState<PlatformEntity[]>([])
  const [filteredPlatforms, setFilteredPlatforms] = useState<PlatformEntity[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchPlatforms()
  }, [])

  useEffect(() => {
    filterPlatforms()
  }, [platforms, searchTerm])

  const fetchPlatforms = async () => {
    try {
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .order('name')

      if (error) throw error

      const platformsData = data.map(platform => ({
        id: platform.id,
        name: platform.name,
        description: platform.description,
        iconType: platform.icon_type as IconType,
        iconValue: platform.icon_data,
        color: platform.color_hex,
        category: platform.category || null,
        isActive: platform.is_active,
        createdAt: new Date(platform.created_at),
        updatedAt: new Date(platform.updated_at),
      })) as PlatformEntity[]

      setPlatforms(platformsData)
    } catch (error) {
      console.error('Error fetching platforms:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterPlatforms = () => {
    let filtered = platforms

    if (searchTerm) {
      filtered = filtered.filter(platform =>
        platform.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        platform.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        platform.category?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredPlatforms(filtered)
  }

  const handleDeletePlatform = async (platformId: string) => {
    if (!confirm('Are you sure you want to delete this platform? This action cannot be undone.')) return

    try {
      // Check if platform is being used by any accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id')
        .eq('platform_id', platformId)
        .limit(1)

      if (accountsError) throw accountsError

      if (accounts && accounts.length > 0) {
        alert('Cannot delete platform that is being used by existing accounts.')
        return
      }

      const { error } = await supabase
        .from('platforms')
        .delete()
        .eq('id', platformId)

      if (error) throw error

      setPlatforms(platforms.filter(p => p.id !== platformId))
    } catch (error) {
      console.error('Error deleting platform:', error)
      alert('Failed to delete platform. Please try again.')
    }
  }

  const togglePlatformStatus = async (platformId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('platforms')
        .update({ is_active: !isActive, updated_at: new Date().toISOString() })
        .eq('id', platformId)

      if (error) throw error

      setPlatforms(platforms.map(p => 
        p.id === platformId ? { ...p, isActive: !isActive } : p
      ))
    } catch (error) {
      console.error('Error updating platform status:', error)
    }
  }

  const getIconDisplay = (platform: PlatformEntity) => {
    switch (platform.iconType) {
      case IconType.EMOJI:
        return <span className="text-2xl">{platform.iconValue}</span>
      case IconType.TEXT:
        return <span className="text-lg font-bold text-white">{platform.iconValue}</span>
      case IconType.URL:
        return <img src={platform.iconValue} alt={platform.name} className="w-8 h-8 rounded" />
      case IconType.IMAGE:
        return <span className="text-xs font-bold text-white">{platform.name.slice(0, 2).toUpperCase()}</span>
      default:
        return <span className="text-xs font-bold text-white">{platform.name.slice(0, 2).toUpperCase()}</span>
    }
  }

  const getIconTypeIcon = (iconType: IconType) => {
    switch (iconType) {
      case IconType.EMOJI:
        return <span className="text-lg">😀</span>
      case IconType.TEXT:
        return <Type className="w-4 h-4" />
      case IconType.URL:
        return <LinkIcon className="w-4 h-4" />
      case IconType.IMAGE:
        return <Image className="w-4 h-4" />
      default:
        return <Type className="w-4 h-4" />
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link href="/dashboard">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Platform Management</h1>
                <p className="text-gray-600 mt-2">
                  Manage subscription platforms and services for your accounts
                </p>
              </div>
              <Link href="/platforms/create">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Platform
                </Button>
              </Link>
            </div>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search platforms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* Platforms Grid */}
          {filteredPlatforms.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Palette className="mx-auto h-12 w-12 text-gray-400" />
                <p className="text-gray-500 mb-4 mt-4">
                  {platforms.length === 0 ? "No platforms created yet." : "No platforms match your search."}
                </p>
                {platforms.length === 0 && (
                  <Link href="/platforms/create">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Platform
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPlatforms.map((platform) => (
                <Card key={platform.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: platform.color }}
                        >
                          {getIconDisplay(platform)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{platform.name}</h3>
                          {platform.description && (
                            <p className="text-sm text-gray-500 mt-1">{platform.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={platform.isActive ? "default" : "secondary"}>
                          {platform.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Icon Type:</span>
                        <div className="flex items-center space-x-2">
                          {getIconTypeIcon(platform.iconType)}
                          <span className="font-medium capitalize">{platform.iconType}</span>
                        </div>
                      </div>
                      
                      {platform.category && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Category:</span>
                          <span className="font-medium">{platform.category}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Color:</span>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-4 h-4 rounded border"
                            style={{ backgroundColor: platform.color }}
                          />
                          <span className="font-medium font-mono text-xs">{platform.color}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t flex justify-between items-center">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => togglePlatformStatus(platform.id, platform.isActive)}
                          >
                            {platform.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                        <div className="flex space-x-2">
                          <Link href={`/platforms/${platform.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Edit className="w-3 h-3" />
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePlatform(platform.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}