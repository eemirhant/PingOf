import { InvalidInviteCard } from "@/components/auth/invalid-invite";
import { JoinForm } from "@/components/auth/join-form";
import { getOrganizationByInviteCode } from "@/lib/auth/join";

type JoinByCodePageProps = {
  params: Promise<{ code: string }>;
};

export default async function JoinByCodePage({ params }: JoinByCodePageProps) {
  const { code } = await params;
  const organization = await getOrganizationByInviteCode(code);

  if (!organization) {
    return <InvalidInviteCard code={code} />;
  }

  return (
    <JoinForm inviteCode={organization.inviteCode} organizationName={organization.name} />
  );
}
