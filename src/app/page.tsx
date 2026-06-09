import { redirect } from 'next/navigation';

export default function RootPage() {
  const tenantKey = process.env.NEXT_PUBLIC_TENANT_KEY || 'columbia';
  redirect(`/${tenantKey}/login`);
}
