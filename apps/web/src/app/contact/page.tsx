import { InformationPage, supportEmail } from "@/components/public-shell";
export const metadata = { title: "Contact" };
export default function Contact() { return <InformationPage title="Contact the creator" intro="For support, feedback and privacy questions about AI Video Studio.">
  <section><h2>Email</h2><p><a href={`mailto:${supportEmail}`}>{supportEmail}</a></p><p>This opens your email application. There is no in-app message submission or guaranteed response time.</p></section>
  <section><h2>What to include</h2><p>Describe what you were trying to do, the approximate time and a sanitized error message. Please do not send passwords, provider keys, cookies, access tokens or private video links. Screenshots should hide personal information.</p></section>
  <section><h2>Account and privacy requests</h2><p>Explain the request without sending credentials. Password-reset emails are unavailable in this preview. An email message alone cannot establish ownership of an account, so support cannot promise an account recovery or deletion without appropriate verification.</p></section>
  </InformationPage>; }
