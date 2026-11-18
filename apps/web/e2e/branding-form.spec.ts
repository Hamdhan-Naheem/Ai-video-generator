import {test,expect} from "@playwright/test";

test("Branding preview has empty reconciled fields, bounded benefit lines and shared text budget",async({page})=>{
 await page.goto("/preview/create?mode=branding");
 for(const label of ["Product name","What is your product?","Benefits to highlight","Brand details"])await expect(page.getByRole("textbox",{name:label,exact:true})).toHaveValue("");
 const name=page.getByRole("textbox",{name:"Product name",exact:true});await name.fill("  ");await name.press("Tab");await expect(name).toHaveAttribute("aria-invalid","true");await name.fill("Commuter backpack");await expect(name).not.toHaveAttribute("aria-invalid","true");
 const description=page.getByRole("textbox",{name:"What is your product?",exact:true});await expect(description).not.toHaveAttribute("required");
 const benefits=page.getByRole("textbox",{name:"Benefits to highlight",exact:true});await benefits.fill("x".repeat(201));await expect(benefits).toHaveAttribute("aria-invalid","true");await expect(benefits).toHaveAccessibleDescription(/200 characters/);
 await benefits.fill(Array(9).fill("Benefit").join("\n"));await expect(benefits).toHaveAttribute("aria-invalid","true");await benefits.fill("One clear benefit\nA second supported benefit");await expect(benefits).not.toHaveAttribute("aria-invalid","true");
 await description.fill("x".repeat(3999));const brand=page.getByRole("textbox",{name:"Brand details",exact:true});await brand.fill("ab");await expect(brand).toHaveAttribute("aria-invalid","true");await expect(brand).toHaveAccessibleDescription(/4,000 characters/);await expect(description).toHaveValue("x".repeat(3999));await description.fill("");await expect(brand).not.toHaveAttribute("aria-invalid","true");
 for(const checkbox of await page.getByRole("checkbox").all())await expect(checkbox).not.toBeChecked();
 await expect(page.getByRole("combobox",{name:"Intended use"})).toHaveValue("");
 for(const label of ["Choose files","Preview voice","Save draft","Generate video"])await expect(page.getByRole("button",{name:label,exact:true})).toBeDisabled();
});

test("Branding preserves responsive structure, palette and safe fixture boundaries",async({page,isMobile},testInfo)=>{
 const mutations:string[]=[];page.on("request",request=>{if(request.method()!=="GET")mutations.push(request.method());});
 await page.goto("/preview/create?mode=branding");await page.getByRole("textbox",{name:"Product name",exact:true}).fill("A real product name");
 await page.getByRole("radio",{name:/90 sec/}).check();await page.getByRole("radio",{name:/Portrait/}).check();
 const dropped=await page.locator(".software-upload-zone").evaluate(element=>{const data=new DataTransfer();data.items.add(new File(["image"],"product.png",{type:"image/png"}));const event=new DragEvent("drop",{bubbles:true,cancelable:true,dataTransfer:data});element.dispatchEvent(event);return event.defaultPrevented;});expect(dropped).toBe(true);await expect(page.getByRole("status")).toContainText("No file was opened or uploaded");
 await expect(page.locator('input[type="file"], audio, video')).toHaveCount(0);expect(mutations).toEqual([]);
 await expect(page.getByRole("main")).toHaveCSS("background-color","rgb(247, 246, 242)");expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const details=await page.getByRole("region",{name:"Product details",exact:true}).boundingBox(),settings=await page.locator(".education-settings").boundingBox();expect(details).toBeTruthy();expect(settings).toBeTruthy();if(isMobile)expect(settings!.y).toBeGreaterThan(details!.y+details!.height);else expect(settings!.x).toBeGreaterThan(details!.x+details!.width);
 expect(await page.locator("[id]").evaluateAll(elements=>{const ids=elements.map(item=>item.id);return ids.filter((id,index)=>ids.indexOf(id)!==index);})).toEqual([]);
 await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();window.scrollTo(0,0);});await page.screenshot({path:`../../.cache/w13-preview-${testInfo.project.name}.png`,fullPage:true});
 await page.reload();await expect(page.getByRole("textbox",{name:"Product name",exact:true})).toHaveValue("");
});
