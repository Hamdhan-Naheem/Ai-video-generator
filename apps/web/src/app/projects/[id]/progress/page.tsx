import {notFound} from 'next/navigation';
import {IdSchema} from '@contracts';
import {AccountWorkspace} from '@/components/account-workspace';
export const metadata={title:'Education video progress'};
export default async function ProgressPage({params}:{params:Promise<{id:string}>}){const id=(await params).id;if(!IdSchema.safeParse(id).success)notFound();return <AccountWorkspace key={id} projectId={id} progressOnly/>;}
