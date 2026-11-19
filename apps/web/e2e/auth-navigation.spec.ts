import {test,expect} from '@playwright/test';
for(const signup of [false,true])test(`${signup?'signup':'signin'} clears secrets without validation errors during successful navigation`,async({page})=>{
 test.setTimeout(120_000);
 let attempts=0;
 await page.addInitScript(()=>{
  let populated=false;
  new MutationObserver(()=>{
   const form=document.querySelector('form.auth-form'),password=form?.querySelector<HTMLInputElement>('input[name="password"]');
   if(password?.value)populated=true;
   if(populated&&password?.value==='')sessionStorage.setItem('auth-cleared-state',JSON.stringify({busy:form?.getAttribute('aria-busy'),disabled:password.disabled,invalid:form?.querySelectorAll('[aria-invalid="true"]').length,confirm:form?.querySelector<HTMLInputElement>('input[name="confirmPassword"]')?.value??''}));
  }).observe(document,{subtree:true,childList:true,attributes:true});
 });
 await page.route('**/api/v1/auth/csrf',route=>route.fulfill({json:{data:{csrfToken:'synthetic-csrf'}}}));
 await page.route(`**/api/v1/auth/${signup?'sign-up':'sign-in'}`,route=>{attempts++;return route.fulfill(attempts===1?{status:503,json:{error:{code:'SERVICE_UNAVAILABLE',message:'Please try again.',requestId:'synthetic'}}}:{json:{data:{authenticated:true}}});});
 await page.route('**/dashboard',route=>route.fulfill({contentType:'text/html',body:'<h1>Navigation fixture</h1>'}));
 await page.goto(signup?'/sign-up':'/sign-in');
 if(signup)await page.getByLabel('Full name',{exact:true}).fill('Auth fixture');
 await page.getByLabel('Email',{exact:true}).fill('auth-fixture@example.invalid');
 const password=page.getByLabel('Password',{exact:true});await password.fill('Synthetic-password-2026!');
 if(signup)await page.getByLabel('Confirm password',{exact:true}).fill('Synthetic-password-2026!');
 const button=page.getByRole('button',{name:signup?'Create account':'Sign in',exact:true});
 await button.click();await expect(button).toBeEnabled();expect(attempts).toBe(1);await expect(password).toHaveValue('Synthetic-password-2026!');
 await button.click();await expect(page.getByRole('heading',{name:'Navigation fixture'})).toBeVisible();
 const state=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('auth-cleared-state')??'null'));
 expect(state).toEqual({busy:'true',disabled:true,invalid:0,confirm:''});expect(attempts).toBe(2);
});
