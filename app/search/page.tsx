import { PublicDiscovery } from "../../components/public/public-discovery.tsx";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "" } = await searchParams;

  return <PublicDiscovery initialSearch={q} title="Search local food" />;
}
