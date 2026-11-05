import {notFound} from "next/navigation";
import {IdSchema} from "@contracts";
import {AccountWorkspace} from "@/components/account-workspace";
export const metadata={title:"Edit draft"};
export default async function ProjectPage({params}: {params:Promise<{id:string}>}) {
 const id=(await params).id;if(!IdSchema.safeParse(id).success)notFound();
 return <AccountWorkspace key={id} projectId={id}/>;
}
