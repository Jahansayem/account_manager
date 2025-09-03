import { supabase } from './supabase'

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
const ONESIGNAL_REST_API_KEY = 'os_v2_app_wxrjis2ruraurfohsvodii6pzo5kb5sjqdhejamhik4cekvjcr36tjpqs5qrckgmshlfa5zfdaxhhdjcvdzqq3eint3f4jsqxbzdbya'

export interface NotificationPayload {
  headings: { en: string }
  contents: { en: string }
  included_segments?: string[]
  filters?: Array<{
    field: string
    key: string
    relation: string
    value: string
  }>
  data?: Record<string, string | number | boolean>
  url?: string
}

class OneSignalService {
  private isInitialized = false

  async initialize() {
    if (this.isInitialized || !ONESIGNAL_APP_ID || typeof window === 'undefined') return

    try {
      // Only initialize on client side
      if (typeof window !== 'undefined') {
        const { default: OneSignal } = await import('react-onesignal')
        
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerParam: {
            scope: '/'
          },
          safari_web_id: 'web.onesignal.auto.df7b1d6e-c67b-48f6-8be4-6ed4abff6b37',
        })

        this.isInitialized = true
        // OneSignal initialized successfully
      }
    } catch (error) {
      console.warn('OneSignal initialization failed (normal for development):', error.message)
      // Don't throw error - just log it as OneSignal web push requires proper domain setup
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (!this.isInitialized) {
      console.warn('OneSignal not initialized - skipping permission request')
      return false
    }

    try {
      const { default: OneSignal } = await import('react-onesignal')
      
      const permission = await OneSignal.Notifications.requestPermission()
      // Permission status updated
      
      return permission
    } catch (error) {
      console.warn('Failed to request notification permission:', error.message)
      return false
    }
  }

  async getUserId(): Promise<string | null> {
    if (!this.isInitialized) return null

    try {
      const { default: OneSignal } = await import('react-onesignal')
      const userId = await OneSignal.User.PushSubscription.id
      return userId || null
    } catch (error) {
      console.warn('Failed to get OneSignal user ID:', error.message)
      return null
    }
  }

  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    if (!ONESIGNAL_REST_API_KEY) {
      console.error('OneSignal REST API key not configured')
      return false
    }

    try {
      const response = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          ...payload,
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        // Notification sent successfully
        return true
      } else {
        console.error('Failed to send notification:', result)
        return false
      }
    } catch (error) {
      console.error('Error sending notification:', error)
      return false
    }
  }

  // Business logic notifications
  async notifyNewAccountCreated(userEmail: string, platformName: string): Promise<boolean> {
    return this.sendNotification({
      headings: { en: "New Account Created" },
      contents: { en: `A new ${platformName} account has been created!` },
      included_segments: ['All'],
      data: {
        type: 'new_account',
        userEmail,
        platformName,
      },
    })
  }

  async notifyNewCustomerAdded(customerName: string, platformName: string): Promise<boolean> {
    return this.sendNotification({
      headings: { en: "New Customer Added" },
      contents: { en: `${customerName} has been added to ${platformName} account` },
      included_segments: ['All'],
      data: {
        type: 'new_customer',
        customerName,
        platformName,
      },
    })
  }

  async notifyPaymentDue(customerName: string, amount: number): Promise<boolean> {
    return this.sendNotification({
      headings: { en: "Payment Due Reminder" },
      contents: { en: `${customerName} has a payment of ৳${amount} due today` },
      included_segments: ['All'],
      data: {
        type: 'payment_due',
        customerName,
        amount,
      },
    })
  }

  async notifyAccountExpiring(platformName: string, expiryDate: string): Promise<boolean> {
    return this.sendNotification({
      headings: { en: "Account Expiring Soon" },
      contents: { en: `Your ${platformName} account expires on ${expiryDate}` },
      included_segments: ['All'],
      data: {
        type: 'account_expiring',
        platformName,
        expiryDate,
      },
    })
  }

  // Daily payment reminders - this would be called by a scheduled job
  async sendDailyPaymentReminders() {
    try {
      // Fetch customers with due payments
      const { data: customers, error } = await supabase
        .from('customers')
        .select(`
          *,
          accounts(
            email,
            platforms(name)
          )
        `)
        .eq('payment_status', 'due')

      if (error) throw error

      // Found customers with due payments

      // Send notification for each customer
      for (const customer of customers || []) {
        await this.notifyPaymentDue(
          customer.customer_name,
          customer.amount_paid
        )
      }

      return true
    } catch (error) {
      console.error('Failed to send daily payment reminders:', error)
      return false
    }
  }
}

export const oneSignalService = new OneSignalService()