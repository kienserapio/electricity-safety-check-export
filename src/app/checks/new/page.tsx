import type { Metadata } from 'next'

import { SafetyCheckForm } from '@/components/SafetyCheckForm'

export const metadata: Metadata = {
  title: 'New Electrical Safety Check',
}

export default function NewSafetyCheckPage() {
  return <SafetyCheckForm />
}
