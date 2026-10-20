import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PDFDocument,degrees} from 'pdf-lib';

import Razorpay from 'razorpay';
import crypto from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
const app=express(),PORT=process.env.PORT||4000,MAX=30*1024*1024,MAX_FILES=15;
app.disable('x-powered-by');
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');next()});
app.use(express.json({limit:'32kb'}));
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:MAX,files:MAX_FILES},fileFilter:(_r,f,cb)=>{const ok=f.mimetype==='application/pdf'||f.mimetype==='image/jpeg'||f.mimetype==='image/png';cb(ok?null:new Error('Upload PDF files or JPG/PNG images only.'),ok)}});
app.get('/api/health',(_req,res)=>res.json({ok:true,name:'DocSwift API'}));
function requirePdfs(files,min=1){if(!files||files.length<min){let e=new Error('Please upload at least '+min+' PDF file'+(min===1?'':'s')+'.');e.status=400;throw e}for(const f of files){if(f.mimetype!=='application/pdf'&&!f.originalname.toLowerCase().endsWith('.pdf')){let e=new Error(f.originalname+' is not a PDF file.');e.status=400;throw e}}}
function parsePages(value,total){const a=String(value||'').split(',').map(x=>Number(x.trim()));if(!a.length||a.some(n=>!Number.isInteger(n)||n<1||n>total))throw Object.assign(new Error('Enter valid page numbers between 1 and '+total+', separated by commas.'),{status:400});if(new Set(a).size!==a.length)throw Object.assign(new Error('Page numbers must not repeat.'),{status:400});return a.map(n=>n-1)}
function sendPdf(res,bytes,name){res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition','attachment; filename="'+name+'"');res.setHeader('Cache-Control','no-store');res.send(Buffer.from(bytes))}
const wrap=fn=>async(req,res,next)=>{try{await fn(req,res,next)}catch(e){next(e)}};
const billingPlans={premium:{amount:9900,currency:'INR',days:30}};
function razorpayError(err){const status=err?.statusCode===401||err?.status===401?401:(err?.statusCode>=400&&err?.statusCode<500?err.statusCode:500);return Object.assign(new Error(status===401?'Razorpay authentication failed. Check the server API keys.':(err?.error?.description||err?.message||'Razorpay request failed.')), {status});}
function razorpayClient(){const key_id=process.env.RAZORPAY_KEY_ID,key_secret=process.env.RAZORPAY_KEY_SECRET;if(!key_id||!key_secret)throw Object.assign(new Error('Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the server environment.'),{status:503});return {client:new Razorpay({key_id,key_secret}),key_id};}
const allowedOrigins=new Set([
  'https://rajtivari.github.io',
  'https://docswift.rajtivari.qd.je',
  'http://docswift.rajtivari.qd.je',
  ...(process.env.FRONTEND_ORIGIN||'').split(',').map(value=>value.trim()).filter(Boolean)
]);
app.use('/api',(req,res,next)=>{
  const origin=req.headers.origin;
  if(origin&&allowedOrigins.has(origin)){
    res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Vary','Origin');
    res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  }
  if(req.method==='OPTIONS')return origin&&allowedOrigins.has(origin)?res.sendStatus(204):res.sendStatus(403);
  next();
});
function supabaseAdmin(){
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw Object.assign(new Error('Premium account billing is not configured yet. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the Render server environment.'),{status:503});
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
async function requireUser(req){
  const header=req.headers.authorization||'';
  const token=header.startsWith('Bearer ')?header.slice(7):'';
  if(!token)throw Object.assign(new Error('Please sign in to your DocSwift account before purchasing or checking Premium.'),{status:401});
  const admin=supabaseAdmin();
  const {data,error}=await admin.auth.getUser(token);
  if(error||!data?.user)throw Object.assign(new Error('Your session is invalid or expired. Sign in again and retry.'),{status:401});
  return {admin,user:data.user};
}

// NexoraPay sandbox demonstration only. This never charges a customer.
const nexoraBase=(process.env.NEXORAPAY_BASE_URL||'https://nexorapay-sandbox.onrender.com').replace(/\/$/,'');
function nexoraConfig(){const key=process.env.NEXORAPAY_MERCHANT_API_KEY;if(!key||!/^np_test_[a-f0-9]{64}$/.test(key))throw Object.assign(new Error('NexoraPay sandbox is not configured. Add a sandbox merchant API key to the DocSwift server environment.'),{status:503});return key}
app.get('/api/nexorapay/sandbox/config',(_req,res)=>res.json({enabled:Boolean(process.env.NEXORAPAY_MERCHANT_API_KEY&&/^np_test_[a-f0-9]{64}$/.test(process.env.NEXORAPAY_MERCHANT_API_KEY)),mode:'SANDBOX',realPaymentsEnabled:false}));
app.post('/api/nexorapay/sandbox/payments',wrap(async(req,res)=>{
  const key=nexoraConfig();
  const response=await fetch(nexoraBase+'/api/merchant/payments',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+key},body:JSON.stringify({amount:99})});
  const body=await response.json().catch(()=>({error:'invalid_nexorapay_response'}));
  if(!response.ok)throw Object.assign(new Error(body.error||'NexoraPay sandbox could not create a test payment.'),{status:response.status>=400&&response.status<500?502:503});
  res.status(201).json({mode:'SANDBOX',realPaymentsEnabled:false,payment:body,message:'Test payment only. No money was collected.'});
}));
app.post('/api/nexorapay/sandbox/payments/:id/simulate-success',wrap(async(req,res)=>{
  if(!/^[0-9a-f-]{36}$/i.test(req.params.id))throw Object.assign(new Error('Invalid sandbox payment ID.'),{status:400});
  const key=nexoraConfig();
  const response=await fetch(nexoraBase+'/api/merchant/payments/'+req.params.id+'/simulate-success',{method:'POST',headers:{authorization:'Bearer '+key}});
  const body=await response.json().catch(()=>({error:'invalid_nexorapay_response'}));
  if(!response.ok)throw Object.assign(new Error(body.error||'Could not simulate sandbox payment status.'),{status:response.status>=400&&response.status<500?409:503});
  res.json({mode:'SANDBOX',realPaymentsEnabled:false,...body,message:'Simulated result only. No money was collected.'});
}));
app.get('/api/billing/config',(_req,res)=>res.json({enabled:Boolean(process.env.RAZORPAY_KEY_ID&&process.env.RAZORPAY_KEY_SECRET),mode:(process.env.RAZORPAY_KEY_ID||'').startsWith('rzp_test_')?'test':'live'}));
app.get('/api/billing/status',wrap(async(req,res)=>{
  const {admin,user}=await requireUser(req);
  const {data,error}=await admin.from('subscriptions').select('plan,status,current_period_end').eq('user_id',user.id).eq('plan','premium').eq('status','active').gt('current_period_end',new Date().toISOString()).order('current_period_end',{ascending:false}).limit(1).maybeSingle();
  if(error)throw Object.assign(new Error('Could not check Premium status in the database. Check the Supabase server configuration.'),{status:503});
  res.json({premium:Boolean(data),accessUntil:data?.current_period_end||null,plan:data?.plan||'free'});
}));
app.post(['/api/billing/order','/api/create-order'],wrap(async(req,res)=>{
  const {admin,user}=await requireUser(req);
  const plan=billingPlans[req.body?.plan];
  if(!plan)throw Object.assign(new Error('Choose a valid plan.'),{status:400});
  const {client,key_id}=razorpayClient();
  if(!key_id.startsWith('rzp_test_')&&process.env.ALLOW_LIVE_PAYMENTS!=='true')throw Object.assign(new Error('Live payments are disabled. Configure Razorpay test keys first.'),{status:403});
  if(!Number.isInteger(plan.amount)||plan.amount<100)throw Object.assign(new Error('Payment amount must be at least 100 paise.'),{status:400});
  let order;
  try{order=await client.orders.create({amount:plan.amount,currency:plan.currency,receipt:'ds_'+crypto.randomBytes(8).toString('hex'),notes:{product:'DocSwift',plan:'premium',user_id:user.id,mode:key_id.startsWith('rzp_test_')?'test':'live'}})}catch(err){throw razorpayError(err)}
  const {error}=await admin.from('payments').insert({user_id:user.id,provider:'razorpay',provider_order_id:order.id,amount_paise:order.amount,currency:order.currency,status:'created'});
  if(error)throw Object.assign(new Error('Payment order was created, but billing could not save it. Please retry or contact support.'),{status:503});
  res.json({order_id:order.id,orderId:order.id,amount:order.amount,currency:order.currency,keyId:key_id,demo:key_id.startsWith('rzp_test_')});
}));
app.post(['/api/billing/verify','/api/verify-payment'],wrap(async(req,res)=>{
  const {admin,user}=await requireUser(req);
  const {razorpay_order_id,razorpay_payment_id,razorpay_signature,plan='premium'}=req.body||{};
  if(!razorpay_order_id||!razorpay_payment_id||!razorpay_signature||!billingPlans[plan])throw Object.assign(new Error('Missing payment verification details.'),{status:400});
  const {client}=razorpayClient();
  const expected=crypto.createHmac('sha256',process.env.RAZORPAY_KEY_SECRET).update(razorpay_order_id+'|'+razorpay_payment_id).digest('hex');
  const a=Buffer.from(expected),b=Buffer.from(String(razorpay_signature));
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))throw Object.assign(new Error('Payment signature could not be verified. Access was not granted.'),{status:400});
  let order,payment;
  try{[order,payment]=await Promise.all([client.orders.fetch(razorpay_order_id),client.payments.fetch(razorpay_payment_id)])}catch(err){throw razorpayError(err)}
  if(order.notes?.user_id!==user.id||order.notes?.plan!=='premium')throw Object.assign(new Error('This payment order does not belong to your signed-in account.'),{status:403});
  if(order.amount!==billingPlans[plan].amount||order.currency!==billingPlans[plan].currency)throw Object.assign(new Error('Payment amount does not match the Premium plan.'),{status:400});
  if(payment.order_id!==razorpay_order_id||payment.amount!==order.amount||payment.currency!==order.currency||payment.status!=='captured')throw Object.assign(new Error('Payment is not captured and verified yet. No Premium access was granted.'),{status:402});
  const {data:storedPayment,error:storedPaymentError}=await admin.from('payments').select('status,provider_payment_id').eq('provider_order_id',razorpay_order_id).eq('user_id',user.id).maybeSingle();
  if(storedPaymentError)throw Object.assign(new Error('Could not check whether this payment was already processed.'),{status:503});
  if(!storedPayment)throw Object.assign(new Error('This payment order was not found for your account.'),{status:403});
  if(storedPayment.status==='captured'||storedPayment.provider_payment_id)throw Object.assign(new Error('This payment has already been processed. Premium status will be checked from your account.'),{status:409});
  const now=new Date(),accessUntil=new Date(now.getTime()+billingPlans[plan].days*86400000);
  const {error:paymentError}=await admin.from('payments').update({provider_payment_id:razorpay_payment_id,status:'captured',updated_at:now.toISOString()}).eq('provider_order_id',razorpay_order_id).eq('user_id',user.id).eq('status','created').is('provider_payment_id',null);
  if(paymentError)throw Object.assign(new Error('Payment was verified, but the database could not save it. Please contact support before retrying.'),{status:503});
  const {error:subError}=await admin.from('subscriptions').insert({user_id:user.id,plan:'premium',status:'active',provider:'razorpay',provider_subscription_id:razorpay_payment_id,current_period_start:now.toISOString(),current_period_end:accessUntil.toISOString()});
  if(subError)throw Object.assign(new Error('Payment was verified, but Premium status could not be saved. Please contact support.'),{status:503});
  res.json({verified:true,plan:'premium',mode:(process.env.RAZORPAY_KEY_ID||'').startsWith('rzp_test_')?'test':'live',accessUntil:accessUntil.toISOString(),message:'Payment verified and Premium access saved to your account.'});
}));

app.post('/api/merge',upload.array('files',MAX_FILES),wrap(async(req,res)=>{requirePdfs(req.files,2);const out=await PDFDocument.create();for(const f of req.files){const doc=await PDFDocument.load(f.buffer);(await out.copyPages(doc,doc.getPageIndices())).forEach(p=>out.addPage(p))}sendPdf(res,await out.save(),'docswift-merged.pdf')}));
app.post('/api/split',upload.single('file'),wrap(async(req,res)=>{requirePdfs(req.file?[req.file]:[]);const doc=await PDFDocument.load(req.file.buffer),ids=parsePages(req.body.pages,doc.getPageCount()),out=await PDFDocument.create();(await out.copyPages(doc,ids)).forEach(p=>out.addPage(p));sendPdf(res,await out.save(),'docswift-split.pdf')}));
app.post('/api/rotate',upload.single('file'),wrap(async(req,res)=>{requirePdfs(req.file?[req.file]:[]);const doc=await PDFDocument.load(req.file.buffer),angle=Number(req.body.angle||90);if(![90,180,270].includes(angle))throw Object.assign(new Error('Choose 90, 180 or 270 degrees.'),{status:400});doc.getPages().forEach(p=>p.setRotation(degrees((p.getRotation().angle+angle)%360)));sendPdf(res,await doc.save(),'docswift-rotated.pdf')}));
app.post('/api/reorder',upload.single('file'),wrap(async(req,res)=>{requirePdfs(req.file?[req.file]:[]);const doc=await PDFDocument.load(req.file.buffer),ids=parsePages(req.body.order,doc.getPageCount());if(ids.length!==doc.getPageCount()||[...ids].sort((a,b)=>a-b).some((n,i)=>n!==i))throw Object.assign(new Error('Enter every page exactly once, e.g. 3,1,2 for a 3-page PDF.'),{status:400});const out=await PDFDocument.create();(await out.copyPages(doc,ids)).forEach(p=>out.addPage(p));sendPdf(res,await out.save(),'docswift-reordered.pdf')}));
app.post('/api/images-to-pdf',upload.array('files',MAX_FILES),wrap(async(req,res)=>{if(!req.files?.length)throw Object.assign(new Error('Choose at least one JPG or PNG image.'),{status:400});const out=await PDFDocument.create();for(const f of req.files){const img=f.mimetype==='image/png'?await out.embedPng(f.buffer):await out.embedJpg(f.buffer),p=out.addPage([img.width,img.height]);p.drawImage(img,{x:0,y:0,width:img.width,height:img.height})}sendPdf(res,await out.save(),'docswift-images.pdf')}));
app.post('/api/info',upload.single('file'),wrap(async(req,res)=>{requirePdfs(req.file?[req.file]:[]);const doc=await PDFDocument.load(req.file.buffer);res.json({name:req.file.originalname,bytes:req.file.size,pages:doc.getPageCount(),title:doc.getTitle()||'',author:doc.getAuthor()||''})}));
app.post('/api/compress',upload.single('file'),wrap(async(req,res)=>{requirePdfs(req.file?[req.file]:[]);const doc=await PDFDocument.load(req.file.buffer),bytes=await doc.save({useObjectStreams:true});res.setHeader('X-Original-Bytes',String(req.file.size));res.setHeader('X-Result-Bytes',String(bytes.length));sendPdf(res,bytes,'docswift-optimized.pdf')}));
app.use('/api',(req,res)=>res.status(404).json({error:'Unknown tool endpoint.'}));
app.use((err,_req,res,_next)=>{let status=err.status||(err instanceof multer.MulterError?400:500),message=err.message||'Something went wrong.';if(err instanceof multer.MulterError)message=err.code==='LIMIT_FILE_SIZE'?'File exceeds the 30 MB limit.':'Too many files or invalid upload.';if(/encrypted|password/i.test(message))message='This PDF may be password-protected. Unlock it with permission before processing.';if(status>=500){console.error(err);if(!String(_req.path||'').startsWith('/api/billing/'))message='Unable to process this file. It may be malformed or use unsupported features.'}res.status(status).json({error:message})});
const __dirname=path.dirname(fileURLToPath(import.meta.url)),dist=path.resolve(__dirname,'../dist');
app.use(express.static(dist,{index:false}));
app.get('*',(req,res,next)=>{if(req.path==='/'){return res.sendFile(path.join(dist,'index.html'),err=>{if(err)next(err)})}res.status(404).sendFile(path.resolve(__dirname,'../public/404.html'),err=>{if(err)next(err)})});
app.listen(PORT,()=>console.log('DocSwift listening on '+PORT));