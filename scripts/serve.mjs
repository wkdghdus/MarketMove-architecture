/** Tiny development/preview server. No npm dependencies or network required. */
import {createServer} from 'node:http'
import {readFile,stat} from 'node:fs/promises'
import {resolve,join,extname,relative,isAbsolute} from 'node:path'
import {fileURLToPath} from 'node:url'
import {dirname} from 'node:path'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..',process.argv[2]??'.')
const port=Number(process.env.PORT??4173)
const contentTypes={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json;charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.txt':'text/plain;charset=utf-8'}
createServer(async(req,res)=>{
  let urlPath
  try{urlPath=decodeURIComponent(new URL(req.url??'/',`http://${req.headers.host??'localhost'}`).pathname)}catch{res.writeHead(400);res.end('Bad URL');return}
  const pathname=urlPath==='/'?'/index.html':urlPath
  let full=resolve(root,`.${pathname}`)
  if(isAbsolute(relative(root,full))||relative(root,full).startsWith('..')){res.writeHead(403);res.end('Forbidden');return}
  try{
    const item=await stat(full)
    if(item.isDirectory())full=join(full,'index.html')
    const data=await readFile(full)
    res.writeHead(200,{'Content-Type':contentTypes[extname(full)]??'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'})
    res.end(data)
  }catch{res.writeHead(404,{'Content-Type':'text/plain;charset=utf-8'});res.end('Not found')}
}).listen(port,'0.0.0.0',()=>console.log(`MarketMove Atlas: http://localhost:${port} (root: ${root})`))
