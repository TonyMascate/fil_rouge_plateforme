import AlbumGallery from "@/components/albums/AlbumGallery";

export const dynamic = "force-dynamic";

interface AlbumPageProps {
  params: Promise<{ id: string }>;
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { id } = await params;
  return <AlbumGallery albumId={id} />;
}
