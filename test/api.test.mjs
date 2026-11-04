import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {handle} from '../server.mjs';

process.env.GITHUB_TOKEN='testing-github-token';
process.env.AI_API_KEY='testing-ai-token';
process.env.AI_BASE_URL='https://example-ai.invalid/v1';
process.env.AI_MODEL='test-model';

async function onServer(run){
  const server=http.createServer(handle);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  async function request(path, method='GET', body){
    return new Promise((resolve,reject)=>{
      const req=http.request({host:'127.0.0.1',port,path,method,headers:body?{'content-type':'application/json'}:{}},res=>{
        let chunks='';res.on('data',c=>{chunks+=c;});res.on('end',()=>{resolve({status:res.statusCode,data:JSON.parse(chunks)});});
      });req.on('error',reject);req.end(body?JSON.stringify(body):undefined);
    });
  }
  try{return await run(request);}finally{await new Promise(resolve=>server.close(resolve));}
}
const sha='a'.repeat(40);
const base={owner:'example',repo:'repo',branch:'main',path:'docs/index.md',baseSha:sha,message:'docs: update example',content:'# Updated'};

test('reject commit if remote file changed; do not overwrite',async()=>{
  const fetchBefore=globalThis.fetch;let writes=0;
  globalThis.fetch=async(url,options)=>{
    if(options.method==='PUT')writes++;
    return new Response(JSON.stringify({type:'file',encoding:'base64',sha:'b'.repeat(40),content:Buffer.from('# Old').toString('base64')}),{status:200});
  };
  try {await onServer(async request=>{
    const result=await request('/api/commit','POST',base);
    assert.equal(result.status,409);
    assert.match(result.data.error,/veranderd/);
    assert.equal(writes,0);
  });}finally{globalThis.fetch=fetchBefore;}
});

test('commit one revised Markdown document with the expected sha',async()=>{
  const fetchBefore=globalThis.fetch;let posted=null;
  globalThis.fetch=async(url,options)=>{
    if(options.method==='PUT'){
      posted=JSON.parse(options.body);
      return new Response(JSON.stringify({content:{sha:'c'.repeat(40)},commit:{sha:'d'.repeat(40),html_url:'https://github.com/example/repo/commit/example'}}),{status:200});
    }
    return new Response(JSON.stringify({type:'file',encoding:'base64',sha,content:Buffer.from('# Old').toString('base64')}),{status:200});
  };
  try{await onServer(async request=>{
    const result=await request('/api/commit','POST',base);
    assert.equal(result.status,200);
    assert.equal(result.data.sha,'c'.repeat(40));
    assert.equal(posted.sha,sha);
    assert.equal(Buffer.from(posted.content,'base64').toString('utf8'),'# Updated');
    assert.equal(posted.branch,'main');
  });}finally{globalThis.fetch=fetchBefore;}
});

test('agent only replaces the selected source span',async()=>{
  const fetchBefore=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{
    assert.match(url,/chat\/completions/);
    const sent=JSON.parse(options.body);
    assert.equal(sent.model,'test-model');
    return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({replacement:'Improved detail',summary:'Verdiept'})}}]}),{status:200});
  };
  try{await onServer(async request=>{
    const result=await request('/api/edit','POST',{content:'# Title\n\nOld text\n\n# Next',start:9,end:17,instruction:'Verdiep',selectedText:'Old text'});
    assert.equal(result.status,200);
    assert.equal(result.data.content,'# Title\n\nImproved detail\n\n# Next');
    assert.equal(result.data.summary,'Verdiept');
  });}finally{globalThis.fetch=fetchBefore;}
});
