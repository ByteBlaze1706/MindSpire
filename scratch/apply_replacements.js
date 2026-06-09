const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  for (const [target, replacement] of replacements) {
    content = content.split(target).join(replacement);
  }
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated paths/redirects in: ${filePath}`);
  }
}

const baseDir = path.join(__dirname, '..', 'src', 'app');

// 1. student/[id]/page.tsx
replaceInFile(path.join(baseDir, 'counselor', 'student', '[id]', 'page.tsx'), [
  ['params: Promise<{ tenant: string; id: string }>', 'params: Promise<{ id: string }>'],
  ['const resolvedParams = await params;', 'const resolvedParams = await params;'],
  ['redirect(`/${resolvedParams.tenant}/login`);', "redirect('/login');"],
  ['redirect(`/${resolvedParams.tenant}/dashboard`);', "redirect('/dashboard');"],
  ['redirect(`/${resolvedParams.tenant}/pending-approval`);', "redirect('/pending-approval');"],
  ['getStudentClinicalProfile(resolvedParams.tenant, resolvedParams.id)', "getStudentClinicalProfile(process.env.NEXT_PUBLIC_TENANT_KEY || 'nmims', resolvedParams.id)"],
  ['href={`/${resolvedParams.tenant}/counselor`}', 'href="/counselor"'],
  ['tenantSubdomain={resolvedParams.tenant}', "tenantSubdomain={process.env.NEXT_PUBLIC_TENANT_KEY || 'nmims'}"],
]);

// 2. counselor/page.tsx
replaceInFile(path.join(baseDir, 'counselor', 'page.tsx'), [
  [`export default async function CounselorDashboardPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;`, `export default async function CounselorDashboardPage() {`],
  ['redirect(`/${resolvedParams.tenant}/login`);', "redirect('/login');"],
  ['redirect(`/${resolvedParams.tenant}/dashboard`);', "redirect('/dashboard');"],
  ['redirect(`/${resolvedParams.tenant}/pending-approval`);', "redirect('/pending-approval');"],
  ['tenantSubdomain={resolvedParams.tenant}', "tenantSubdomain={process.env.NEXT_PUBLIC_TENANT_KEY || 'nmims'}"],
]);

// 3. dashboard/layout.tsx
replaceInFile(path.join(baseDir, 'dashboard', 'layout.tsx'), [
  [`export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;`, `export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {`],
  ['redirect(`/${resolvedParams.tenant}/login`);', "redirect('/login');"],
  ['`/${resolvedParams.tenant}/dashboard`', '"/dashboard"'],
  ['`/${resolvedParams.tenant}/community`', '"/community"'],
  ['`/${resolvedParams.tenant}/journal`', '"/journal"'],
  ['`/${resolvedParams.tenant}/assessments`', '"/assessments"'],
  ['`/${resolvedParams.tenant}/resources`', '"/resources"'],
  ['`/${resolvedParams.tenant}/playhub`', '"/playhub"'],
  ['`/${resolvedParams.tenant}/notifications`', '"/notifications"'],
  ['`/${resolvedParams.tenant}/settings`', '"/settings"'],
  ['`/${resolvedParams.tenant}/moderation`', '"/moderation"'],
  [`        <div className="border-t border-neutral-100 pt-6">
          <span className="block text-xs font-semibold text-neutral-400">Signed in as</span>
          <span className="block text-xs font-semibold text-neutral-700 truncate mt-1">
            {profile.email}
          </span>`, `        // Fetch anonymous profile details if they exist
        const { data: anonProfile } = await supabase
          .from('anonymous_profiles')
          .select('pseudonym, token_id')
          .eq('user_id', user.id)
          .maybeSingle();
          
        return (
          <div className="min-h-screen bg-gradient-to-tr from-[#FDFBF7] via-[#F5EBE6] to-[#E3EFF3] flex flex-col md:flex-row antialiased">
            <aside className="hidden md:flex w-64 bg-white/70 backdrop-blur-md border-r border-neutral-100 flex-col p-6 space-y-8 sticky top-0 h-screen">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-widest text-neutral-400">Wellness Portal</span>
                <span className="block text-xl font-semibold text-neutral-800 tracking-tight mt-1">MindSpire</span>
              </div>
              <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 rounded-2xl transition duration-150">{link.label}</Link>
                ))}
              </nav>
              <div className="border-t border-neutral-100 pt-6">
                <span className="block text-xs font-semibold text-neutral-400">Signed in as</span>
                <span className="block text-xs font-bold text-neutral-700 truncate mt-1">{anonProfile?.pseudonym || profile.email}</span>
                {anonProfile?.token_id && <span className="block text-[10px] font-mono text-neutral-500 mt-0.5">Token: {anonProfile.token_id}</span>}`],
  ['<MobileNav navLinks={navLinks} profileEmail={profile.email} profileRole={profile.role} />', '<MobileNav navLinks={navLinks} profileEmail={anonProfile?.pseudonym || profile.email} profileRole={profile.role} />']
]);

// 4. dashboard/page.tsx
replaceInFile(path.join(baseDir, 'dashboard', 'page.tsx'), [
  [`export default async function StudentDashboardPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;`, `export default async function StudentDashboardPage() {`],
  ['redirect(`/${resolvedParams.tenant}/login`);', "redirect('/login');"],
]);

// 5. community/post/[id]/page.tsx
replaceInFile(path.join(baseDir, 'community', 'post', '[id]', 'page.tsx'), [
  ['params: Promise<{ tenant: string; id: string }>', 'params: Promise<{ id: string }>'],
  ['redirect(`/${resolvedParams.tenant}/login`);', "redirect('/login');"],
  ['href={`/${resolvedParams.tenant}/community`}', 'href="/community"'],
  ['tenantSubdomain={resolvedParams.tenant}', "tenantSubdomain={process.env.NEXT_PUBLIC_TENANT_KEY || 'nmims'}"],
]);

// 6. journal/page.tsx
replaceInFile(path.join(baseDir, 'journal', 'page.tsx'), [
  [`export default async function StudentJournalPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const resolvedParams = await params;`, `export default async function StudentJournalPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {`],
  ['redirect(`/${resolvedParams.tenant}/login`);', "redirect('/login');"],
  ['submitJournalLog(resolvedParams.tenant,', "submitJournalLog(process.env.NEXT_PUBLIC_TENANT_KEY || 'nmims',"],
  ['deleteJournal(resolvedParams.tenant,', "deleteJournal(process.env.NEXT_PUBLIC_TENANT_KEY || 'nmims',"],
]);

// 7. moderation/page.tsx
replaceInFile(path.join(baseDir, 'moderation', 'page.tsx'), [
  [`export default async function ModerationPortalPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;`, `export default async function ModerationPortalPage() {`],
  ['redirect(`/${resolvedParams.tenant}/login`);', "redirect('/login');"],
  ['redirect(`/${resolvedParams.tenant}/dashboard`);', "redirect('/dashboard');"],
  ['tenantSubdomain={resolvedParams.tenant}', "tenantSubdomain={process.env.NEXT_PUBLIC_TENANT_KEY || 'nmims'}"],
]);

// 8. notifications/page.tsx
replaceInFile(path.join(baseDir, 'notifications', 'page.tsx'), [
  [`export default async function NotificationsCenterPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;`, `export default async function NotificationsCenterPage() {`],
  ['redirect(`/${resolvedParams.tenant}/login`);', "redirect('/login');"],
  ['tenantSubdomain={resolvedParams.tenant}', "tenantSubdomain={process.env.NEXT_PUBLIC_TENANT_KEY || 'nmims'}"],
]);

// 9. onboarding/page.tsx
replaceInFile(path.join(baseDir, 'onboarding', 'page.tsx'), [
  [`export default async function TenantOnboardingPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;`, `export default async function TenantOnboardingPage() {`],
  ['redirect(`/${resolvedParams.tenant}/login`);', "redirect('/login');"],
]);

// 10. pending-approval/page.tsx
replaceInFile(path.join(baseDir, 'pending-approval', 'page.tsx'), [
  [`export default async function PendingApprovalPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;`, `export default async function PendingApprovalPage() {`],
  ['redirect(`/${resolvedParams.tenant}/login`);', "redirect('/login');"],
  ['redirect(`/${resolvedParams.tenant}/dashboard`);', "redirect('/dashboard');"],
  ['redirect(`/${resolvedParams.tenant}/counselor`);', "redirect('/counselor');"],
  ['href={`/${resolvedParams.tenant}/login`}', 'href="/login"'],
]);

// 11. playhub/page.tsx
replaceInFile(path.join(baseDir, 'playhub', 'page.tsx'), [
  [`export default async function StudentPlayHubPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;`, `export default async function StudentPlayHubPage() {`],
  ['redirect(`/${resolvedParams.tenant}/login`);', "redirect('/login');"],
]);

// 12. resources/page.tsx
replaceInFile(path.join(baseDir, 'resources', 'page.tsx'), [
  [`export default async function StudentResourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const resolvedParams = await params;`, `export default async function StudentResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {`],
  ['redirect(`/${resolvedParams.tenant}/login`);', "redirect('/login');"],
  ['toggleBookmarkResource(resolvedParams.tenant,', "toggleBookmarkResource(process.env.NEXT_PUBLIC_TENANT_KEY || 'nmims',"],
  ['href={`/${resolvedParams.tenant}/resources?view=', 'href={`/resources?view='],
]);

// 13. settings/page.tsx
replaceInFile(path.join(baseDir, 'settings', 'page.tsx'), [
  [`export default async function StudentSettingsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;`, `export default async function StudentSettingsPage() {`],
  ['redirect(`/${resolvedParams.tenant}/login`);', "redirect('/login');"],
]);

// 14. counselor/counselor-dashboard-container.tsx
replaceInFile(path.join(baseDir, 'counselor', 'counselor-dashboard-container.tsx'), [
  [`  const filteredRoster = roster.filter(
    (student) =>
      student.pseudonym.toLowerCase().includes(searchRoster.toLowerCase()) ||
      student.email.toLowerCase().includes(searchRoster.toLowerCase())
  );`, `  const filteredRoster = roster.filter(
    (student) =>
      student.pseudonym.toLowerCase().includes(searchRoster.toLowerCase()) ||
      ((student as any).token_id || '').toLowerCase().includes(searchRoster.toLowerCase())
  );`],
  ['placeholder="Search students by pseudonym or email..."', 'placeholder="Search students by pseudonym or Token ID..."'],
  ['<p className="truncate">Email: {student.email}</p>', `<p className="truncate">Token ID: {(student as any).token_id || 'N/A'}</p>`],
  ['href={`/${tenantSubdomain}/counselor/student/${student.id}`}', 'href={`/counselor/student/${student.id}`}'],
]);
