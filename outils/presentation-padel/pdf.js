const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('file:///tmp/claude-0/pres/pres2.html');await p.waitForTimeout(800);
await p.pdf({path:'/tmp/claude-0/pres/presentation.pdf',format:'A4',printBackground:true,preferCSSPageSize:true});await b.close();})();
