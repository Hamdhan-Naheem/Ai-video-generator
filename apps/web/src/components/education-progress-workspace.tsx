"use client";
import Link from 'next/link';
import {useState} from 'react';
import {EducationRun} from '@/components/education-run';
export function EducationProgressWorkspace({projectId}:{projectId:string}){
 const [,setActive]=useState(false);
 return <div className="generation-page"><header className="page-heading"><div><h1>Education video progress</h1><p>Follow your latest generation. Your saved input stays separate.</p></div></header><nav className="education-action-buttons" aria-label="Generation navigation"><Link className="button button-secondary" href={`/projects/${projectId}`}>Edit saved draft</Link><Link className="button button-secondary" href="/videos">My videos</Link></nav><EducationRun projectId={projectId} refresh={0} onActive={setActive} standalone/></div>;
}
