import {AccountWorkspace} from "@/components/account-workspace";
export const metadata={title:"Create video"};
export default async function NewProjectPage({searchParams}: {searchParams:Promise<{mode?:string}>}) {
 const mode=(await searchParams).mode;
 return <AccountWorkspace key={typeof mode==="string"?mode:"selection"} createMode={typeof mode==="string"?mode:""}/>;
}
