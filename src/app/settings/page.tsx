'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/lib/auth/auth-context'
import { useOneSignal } from '@/hooks/useOneSignal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Bell, BellOff, User, Settings, TestTube, Clock, Save, Palette, Globe } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { isInitialized, permissionGranted, userId, requestPermission, oneSignalService } = useOneSignal()
  const [activeTab, setActiveTab] = useState<'notifications' | 'duration' | 'preferences'>('notifications')
  const [settings, setSettings] = useState({
    newAccountNotifications: true,
    newCustomerNotifications: true,
    paymentReminders: true,
    expiringAccountAlerts: true,
  })
  const [durationSettings, setDurationSettings] = useState({
    defaultDuration: 30,
    customDurations: [7, 30, 90, 365],
    durationUnit: 'days' as 'days' | 'months' | 'years',
  })
  const [userPreferences, setUserPreferences] = useState({
    defaultCurrency: 'BDT',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12' as '12' | '24',
    language: 'en',
    theme: 'light' as 'light' | 'dark' | 'system',
  })
  const [customDuration, setCustomDuration] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = () => {
    try {
      const savedDuration = localStorage.getItem('duration_settings')
      if (savedDuration) {
        setDurationSettings(JSON.parse(savedDuration))
      }

      const savedPreferences = localStorage.getItem('user_preferences')
      if (savedPreferences) {
        setUserPreferences(JSON.parse(savedPreferences))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const handlePermissionRequest = async () => {
    setLoading(true)
    try {
      const granted = await requestPermission()
      if (granted) {
        // Permission granted successfully
      } else {
        // Permission denied
      }
    } catch (error) {
      console.error('Error requesting permission:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = (setting: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }))
    // Setting updated
  }

  const handleTestNotification = async () => {
    try {
      const success = await oneSignalService.sendNotification({
        headings: { en: "Test Notification" },
        contents: { en: "This is a test notification from your Account Manager app!" },
        included_segments: ['All'],
        data: {
          type: 'test',
          timestamp: new Date().toISOString(),
        },
      })

      if (success) {
        alert('Test notification sent successfully!')
      } else {
        alert('Failed to send test notification')
      }
    } catch (error) {
      console.error('Error sending test notification:', error)
      alert('Error sending test notification')
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const saveDurationSettings = () => {
    try {
      localStorage.setItem('duration_settings', JSON.stringify(durationSettings))
      alert('Duration settings saved successfully!')
    } catch (error) {
      console.error('Error saving duration settings:', error)
    }
  }

  const saveUserPreferences = () => {
    try {
      localStorage.setItem('user_preferences', JSON.stringify(userPreferences))
      alert('User preferences saved successfully!')
    } catch (error) {
      console.error('Error saving user preferences:', error)
    }
  }

  const addCustomDuration = () => {
    const duration = parseInt(customDuration)
    if (duration > 0 && !durationSettings.customDurations.includes(duration)) {
      setDurationSettings(prev => ({
        ...prev,
        customDurations: [...prev.customDurations, duration].sort((a, b) => a - b)
      }))
      setCustomDuration('')
    }
  }

  const removeCustomDuration = (duration: number) => {
    setDurationSettings(prev => ({
      ...prev,
      customDurations: prev.customDurations.filter(d => d !== duration)
    }))
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link href="/dashboard">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Settings className="w-8 h-8 mr-3" />
              Settings
            </h1>
            <p className="text-gray-600 mt-2">Configure your application preferences and settings</p>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'notifications'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Bell className="w-4 h-4 inline mr-2" />
                  Notifications
                </button>
                <button
                  onClick={() => setActiveTab('duration')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'duration'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Clock className="w-4 h-4 inline mr-2" />
                  Duration Management
                </button>
                <button
                  onClick={() => setActiveTab('preferences')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === 'preferences'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <User className="w-4 h-4 inline mr-2" />
                  User Preferences
                </button>
              </nav>
            </div>
          </div>

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Profile Info */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-sm">{user?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">User ID</p>
                      <p className="text-xs font-mono text-gray-500">{user?.id}</p>
                    </div>
                    {userId && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">OneSignal ID</p>
                        <p className="text-xs font-mono text-gray-500">{userId}</p>
                      </div>
                    )}
                    <div className="pt-4 border-t">
                      <Button variant="outline" onClick={handleSignOut} className="w-full">
                        Sign Out
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Settings */}
              <div className="lg:col-span-2 space-y-6">
                {/* Push Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Bell className="w-5 h-5 mr-2" />
                      Push Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Notification Status */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {permissionGranted ? (
                          <div className="w-3 h-3 bg-green-500 rounded-full" />
                        ) : (
                          <div className="w-3 h-3 bg-red-500 rounded-full" />
                        )}
                        <div>
                          <p className="font-medium">
                            {isInitialized ? 'OneSignal Ready' : 'OneSignal Loading...'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {permissionGranted === null 
                              ? 'Permission not requested yet' 
                              : permissionGranted 
                              ? 'Push notifications enabled' 
                              : 'Push notifications disabled'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={permissionGranted ? "default" : "secondary"}>
                        {permissionGranted ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>

                    {/* Enable Notifications */}
                    {!permissionGranted && (
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
                        <div className="flex items-center space-x-3">
                          <BellOff className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium">Enable Push Notifications</p>
                            <p className="text-sm text-gray-600">
                              Get notified about new accounts, customers, and payment reminders
                            </p>
                          </div>
                        </div>
                        <Button onClick={handlePermissionRequest} disabled={loading}>
                          {loading ? 'Requesting...' : 'Enable'}
                        </Button>
                      </div>
                    )}

                    {/* Notification Preferences */}
                    {permissionGranted && (
                      <div className="space-y-4">
                        <h4 className="font-medium">Notification Preferences</h4>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="newAccountNotifications">New Account Created</Label>
                              <p className="text-sm text-gray-500">When you create a new subscription account</p>
                            </div>
                            <Switch
                              id="newAccountNotifications"
                              checked={settings.newAccountNotifications}
                              onCheckedChange={(checked) => handleSettingChange('newAccountNotifications', checked)}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="newCustomerNotifications">New Customer Added</Label>
                              <p className="text-sm text-gray-500">When a customer is added to an account</p>
                            </div>
                            <Switch
                              id="newCustomerNotifications"
                              checked={settings.newCustomerNotifications}
                              onCheckedChange={(checked) => handleSettingChange('newCustomerNotifications', checked)}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="paymentReminders">Daily Payment Reminders</Label>
                              <p className="text-sm text-gray-500">Daily notifications for customers with due payments</p>
                            </div>
                            <Switch
                              id="paymentReminders"
                              checked={settings.paymentReminders}
                              onCheckedChange={(checked) => handleSettingChange('paymentReminders', checked)}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="expiringAccountAlerts">Account Expiry Alerts</Label>
                              <p className="text-sm text-gray-500">When your accounts are about to expire</p>
                            </div>
                            <Switch
                              id="expiringAccountAlerts"
                              checked={settings.expiringAccountAlerts}
                              onCheckedChange={(checked) => handleSettingChange('expiringAccountAlerts', checked)}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Test Notification */}
                    {permissionGranted && (
                      <div className="pt-4 border-t">
                        <Button 
                          variant="outline" 
                          onClick={handleTestNotification}
                          className="w-full"
                        >
                          <TestTube className="w-4 h-4 mr-2" />
                          Send Test Notification
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* App Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Settings className="w-5 h-5 mr-2" />
                      Application
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-500">Version</p>
                        <p>1.0.0</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-500">Environment</p>
                        <p>Development</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-500">OneSignal Status</p>
                        <Badge variant={isInitialized ? "default" : "secondary"}>
                          {isInitialized ? 'Connected' : 'Disconnected'}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-medium text-gray-500">Database</p>
                        <Badge variant="default">Supabase</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Duration Management Tab */}
          {activeTab === 'duration' && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Default Duration Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultDuration">Default Duration</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="defaultDuration"
                        type="number"
                        min="1"
                        value={durationSettings.defaultDuration}
                        onChange={(e) => setDurationSettings(prev => ({
                          ...prev,
                          defaultDuration: parseInt(e.target.value) || 1
                        }))}
                        className="flex-1"
                      />
                      <select
                        value={durationSettings.durationUnit}
                        onChange={(e) => setDurationSettings(prev => ({
                          ...prev,
                          durationUnit: e.target.value as 'days' | 'months' | 'years'
                        }))}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="days">Days</option>
                        <option value="months">Months</option>
                        <option value="years">Years</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Add Custom Duration</Label>
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Enter duration"
                        value={customDuration}
                        onChange={(e) => setCustomDuration(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={addCustomDuration}>Add</Button>
                    </div>
                  </div>

                  <Button onClick={saveDurationSettings} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    Save Duration Settings
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Custom Duration Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {durationSettings.customDurations.map((duration) => (
                      <div key={duration} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>{duration} {durationSettings.durationUnit}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeCustomDuration(duration)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    {durationSettings.customDurations.length === 0 && (
                      <p className="text-gray-500 text-sm">No custom durations added yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* User Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>General Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultCurrency">Default Currency</Label>
                    <select
                      id="defaultCurrency"
                      value={userPreferences.defaultCurrency}
                      onChange={(e) => setUserPreferences(prev => ({
                        ...prev,
                        defaultCurrency: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="BDT">BDT (৳)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <select
                      id="dateFormat"
                      value={userPreferences.dateFormat}
                      onChange={(e) => setUserPreferences(prev => ({
                        ...prev,
                        dateFormat: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeFormat">Time Format</Label>
                    <select
                      id="timeFormat"
                      value={userPreferences.timeFormat}
                      onChange={(e) => setUserPreferences(prev => ({
                        ...prev,
                        timeFormat: e.target.value as '12' | '24'
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="12">12-hour (AM/PM)</option>
                      <option value="24">24-hour</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Appearance & Language</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <select
                      id="theme"
                      value={userPreferences.theme}
                      onChange={(e) => setUserPreferences(prev => ({
                        ...prev,
                        theme: e.target.value as 'light' | 'dark' | 'system'
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <select
                      id="language"
                      value={userPreferences.language}
                      onChange={(e) => setUserPreferences(prev => ({
                        ...prev,
                        language: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="hi">Hindi</option>
                    </select>
                  </div>

                  <Button onClick={saveUserPreferences} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    Save Preferences
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}