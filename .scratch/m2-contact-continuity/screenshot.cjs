const {openBrowser}=require('@remotion/renderer');
const fs=require('node:fs');
(async()=>{
 const browser=await openBrowser('chrome',{logLevel:'error',browserExecutable:process.cwd()+'/node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell'});
 try{
  const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});
  await page.setViewport({width:1280,height:1080,deviceScaleFactor:1});
  await page.goto({url:'file:///tmp/m2-contact-continuity-proof/index.html',timeout:10000});
  const {value}=await page._client().send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(process.argv[2],Buffer.from(value.data,'base64'));
 }finally{await browser.close({silent:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
