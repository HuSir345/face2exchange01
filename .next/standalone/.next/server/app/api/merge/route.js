"use strict";(()=>{var e={};e.id=86,e.ids=[86],e.modules={517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},7652:(e,t,r)=>{r.r(t),r.d(t,{headerHooks:()=>g,originalPathname:()=>f,requestAsyncStorage:()=>p,routeModule:()=>c,serverHooks:()=>d,staticGenerationAsyncStorage:()=>u,staticGenerationBailout:()=>m});var o={};r.r(o),r.d(o,{POST:()=>POST}),r(8976);var a=r(884),n=r(6132),s=r(5798);let i=require("sharp");var l=r.n(i);async function compressImage(e){try{let t=await e.arrayBuffer(),r=Buffer.from(t),o=.59+.4*Math.random(),a=Math.floor(80*o);console.log("压缩质量系数:",o.toFixed(6)),console.log("最终压缩质量:",a);let n=await l()(r).resize(1920,1920,{fit:"inside",withoutEnlargement:!0}).jpeg({quality:a,progressive:!0}).toBuffer(),s=new File([n],e.name,{type:"image/jpeg"});return console.log("压缩前大小:",(e.size/1024/1024).toFixed(2)+"MB"),console.log("压缩后大小:",(s.size/1024/1024).toFixed(2)+"MB"),s}catch(t){return console.error("图片压缩失败:",t),e}}async function uploadToImageHub(e,t=0){try{let r=new FormData;r.append("source",e),console.log("准备上传图片到图床:",{url:process.env.IMAGEHUB_API_URL,method:"POST",file:{type:e.type,size:`${(e.size/1024/1024).toFixed(2)}MB`,lastModified:e instanceof File?new Date(e.lastModified).toISOString():"N/A",name:e instanceof File?e.name:"blob"},retryCount:t});let o={"X-API-Key":"***"+process.env.IMAGEHUB_API_KEY.slice(-6)};for(let[e,t]of(console.log("请求头:",o),console.log("FormData 内容:"),r.entries()))console.log("- ",e,":",{type:t instanceof Blob?t.type:typeof t,size:t instanceof Blob?`${(t.size/1024/1024).toFixed(2)}MB`:"N/A",name:t instanceof File?t.name:"blob"});let a=Date.now(),n=await fetch(process.env.IMAGEHUB_API_URL,{method:"POST",headers:{"X-API-Key":process.env.IMAGEHUB_API_KEY},body:r}),s=Date.now();if(console.log("图床响应详情:",{timing:{startTime:new Date(a).toISOString(),endTime:new Date(s).toISOString(),duration:`${s-a}ms`},status:{code:n.status,text:n.statusText},headers:Object.fromEntries(n.headers.entries()),type:n.type,url:n.url,redirected:n.redirected}),!n.ok){let e=await n.text();throw console.error("图床上传失败:",{status:n.status,statusText:n.statusText,responseBody:e,timestamp:new Date().toISOString()}),Error("图片上传失败")}let i=await n.json();if(console.log("图床上传成功:",{timing:{total:`${s-a}ms`,timestamp:new Date().toISOString()},response:{status_code:i.status_code,status_txt:i.status_txt,image:i.image},request:{originalFile:{type:e.type,size:`${(e.size/1024/1024).toFixed(2)}MB`,name:e instanceof File?e.name:"blob"}}}),200!==i.status_code)throw console.error("图床返回错误:",{result:i,timestamp:new Date().toISOString(),requestDetails:{fileType:e.type,fileSize:`${(e.size/1024/1024).toFixed(2)}MB`}}),Error(i.status_txt||"图片上传失败");return i.image.url}catch(r){if(t<2){console.log(`上传失败，准备重试 (第${t+1}次):`,{error:r instanceof Error?r.message:String(r),nextAction:"尝试压缩后重新上传",timestamp:new Date().toISOString(),fileInfo:{type:e.type,size:`${(e.size/1024/1024).toFixed(2)}MB`,name:e instanceof File?e.name:"blob"}});let o=await compressImage(e instanceof File?e:new File([e],"image.jpg"));return uploadToImageHub(o,t+1)}throw console.error("图片上传最终失败:",{error:r instanceof Error?r.message:String(r),stack:r instanceof Error?r.stack:void 0,retryCount:t,timestamp:new Date().toISOString(),fileDetails:{type:e.type,size:`${(e.size/1024/1024).toFixed(2)}MB`,name:e instanceof File?e.name:"blob"}}),r}}async function fetchWithRetry(e,t,r=3,o=1e3){let a=Error("Unknown error");for(let n=0;n<r;n++)try{let r=await fetch(e,t);if(r.ok)return r;let o=await r.text();throw Error(`HTTP error! status: ${r.status} - ${o}`)}catch(t){if(console.log(`请求失败，第 ${n+1} 次重试:`,{error:(a=t instanceof Error?t:Error(String(t))).message,nextRetryIn:n<r-1?`${o}ms`:"no more retries",url:e,timestamp:new Date().toISOString()}),n<r-1){await new Promise(e=>setTimeout(e,o));continue}}throw a}async function downloadAndUploadImage(e){try{console.log("开始下载图片:",e);let t=new AbortController,r=setTimeout(()=>t.abort(),3e4),o=await fetchWithRetry(e,{signal:t.signal,headers:{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",Accept:"image/*, */*","Accept-Encoding":"gzip, deflate, br",Connection:"keep-alive"},keepalive:!0},3,1e3).finally(()=>clearTimeout(r));if(!o.ok)throw console.error("图片下载失败:",{status:o.status,statusText:o.statusText,headers:Object.fromEntries(o.headers.entries())}),Error(`图片下载失败: ${o.status} ${o.statusText}`);let a=o.headers.get("content-type");if(!a?.startsWith("image/"))throw console.error("响应不是图片:",a),Error("下载的内容不是图片");let n=await o.blob();return console.log("图片下载完成",{size:`${(n.size/1024/1024).toFixed(2)}MB`,type:n.type}),await uploadToImageHub(n)}catch(t){throw console.error("下载并上传图片失败:",{error:t instanceof Error?t.message:String(t),stack:t instanceof Error?t.stack:void 0,url:e,timestamp:new Date().toISOString()}),t}}async function POST(e){try{let t=["WORKFLOW_ID","COZE_API_URL","AUTHORIZATION","IMAGEHUB_API_URL","IMAGEHUB_API_KEY"].filter(e=>!process.env[e]);if(t.length>0)return console.error("缺少环境变量:",t),new s.Z(JSON.stringify({error:`配置错误: 缺少环境变量 ${t.join(", ")}`,errorType:"ConfigError"}),{status:500,headers:{"Content-Type":"application/json"}});let r=await e.formData().catch(e=>(console.error("解析表单数据失败:",e),null));if(!r)return new s.Z(JSON.stringify({error:"无效的请求数据",errorType:"ValidationError"}),{status:400,headers:{"Content-Type":"application/json"}});let o=r.get("image1"),a=r.get("image2");if(!o||!a)return new s.Z(JSON.stringify({error:"请提供两张图片",errorType:"ValidationError"}),{status:400,headers:{"Content-Type":"application/json"}});try{console.log("开始上传原始图片...");let[e,t]=await Promise.all([uploadToImageHub(o),uploadToImageHub(a)]);console.log("调用 Coze API...");let r=await fetch(process.env.COZE_API_URL,{method:"POST",headers:{Authorization:`Bearer ${process.env.AUTHORIZATION.trim()}`,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({workflow_id:process.env.WORKFLOW_ID.trim(),parameters:{face_image:e,base_image:t}})});if(!r.ok){let e=await r.text();return console.error("Coze API 错误响应:",e),new s.Z(JSON.stringify({error:"AI 处理失败",errorType:"CozeAPIError",details:e}),{status:502,headers:{"Content-Type":"application/json"}})}let n=await r.json();if(0!==n.code)return new s.Z(JSON.stringify({error:n.msg||"AI 处理失败",errorType:"CozeAPIError",details:n}),{status:502,headers:{"Content-Type":"application/json"}});let i="string"==typeof n.data?JSON.parse(n.data):n.data;if(!i?.output)return new s.Z(JSON.stringify({error:"处理结果无效",errorType:"ProcessError",details:n}),{status:500,headers:{"Content-Type":"application/json"}});let l=await downloadAndUploadImage(i.output);return new s.Z(JSON.stringify({resultUrl:l,originalUrl:i.output,rawResponse:n}),{status:200,headers:{"Content-Type":"application/json"}})}catch(e){return console.error("处理过程错误:",{error:e instanceof Error?e.message:String(e),stack:e instanceof Error?e.stack:void 0,timestamp:new Date().toISOString(),details:e instanceof Error?e.cause:void 0}),new s.Z(JSON.stringify({error:e instanceof Error?e.message:"处理失败",errorType:"ProcessError",details:e instanceof Error?e.stack:void 0}),{status:500,headers:{"Content-Type":"application/json"}})}}catch(e){return console.error("API 致命错误:",e),new s.Z(JSON.stringify({error:"服务器内部错误",errorType:"ServerError",details:e instanceof Error?e.stack:void 0}),{status:500,headers:{"Content-Type":"application/json"}})}}let c=new a.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/merge/route",pathname:"/api/merge",filename:"route",bundlePath:"app/api/merge/route"},resolvedPagePath:"D:\\Cursor\\face2exchange\\app\\api\\merge\\route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:p,staticGenerationAsyncStorage:u,serverHooks:d,headerHooks:g,staticGenerationBailout:m}=c,f="/api/merge/route"}};var t=require("../../../webpack-runtime.js");t.C(e);var __webpack_exec__=e=>t(t.s=e),r=t.X(0,[955],()=>__webpack_exec__(7652));module.exports=r})();