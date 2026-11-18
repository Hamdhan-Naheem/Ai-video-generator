import {notFound} from 'next/navigation';
import {IdSchema} from '@contracts';
import {AccountWorkspace} from '@/components/account-workspace';
export const metadata={title:'Video result'};
export default async function ResultPage({params}:{params:Promise<{id:string;revisionId:string}>}){const {id,revisionId}=await params;if(!IdSchema.safeParse(id).success||!IdSchema.safeParse(revisionId).success)notFound();return <AccountWorkspace key={id+'/'+revisionId} projectId={id} resultRevisionId={revisionId}/>;}
