import { redirect } from "next/navigation"

export default async function ProductHome({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  redirect(`/app/${productId}/signals`)
}

