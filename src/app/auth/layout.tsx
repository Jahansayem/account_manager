import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authentication - Account Manager',
  description: 'Sign in or create an account to access Account Manager',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}