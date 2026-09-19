import { CounterpartyDetailClient } from "@/components/counterparties/CounterpartyDetailClient";

export default async function CounterpartyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CounterpartyDetailClient id={id} />;
}
