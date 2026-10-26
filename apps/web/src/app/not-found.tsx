import Link from "next/link";
import { Brand } from "@/components/brand";

export default function NotFound() {
  return <main className="standalone"><section className="standalone-card"><Brand /><h1>This page isn’t available</h1><p>This local preview doesn’t have a page at this address.</p><Link href="/preview/dashboard" className="button button-primary">Back to preview</Link></section></main>;
}
