import {cp,rm,mkdir,readFile} from 'node:fs/promises'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const dest=resolve(root,'dist')
await rm(dest,{recursive:true,force:true})
await mkdir(dest,{recursive:true})
for(const name of ['index.html','src','public'])await cp(resolve(root,name),resolve(dest,name),{recursive:true})
const project=JSON.parse(await readFile(resolve(dest,'src/data/project.json'),'utf-8'))
const index=await readFile(resolve(dest,'index.html'),'utf-8')
if(!index.includes('src/main.js')||!index.includes('src/styles.css'))throw new Error('Build missing source asset references')
// GitHub Pages serves project sites from a subpath, so every local asset reference must be relative.
if(/(?:src|href)="\/(?!\/)/.test(index))throw new Error('index.html contains a root-absolute asset path')
console.log(`Static build ready at ${dest} (${project.nodes.length} systems, ${project.sprints.length} sprints, ${project.tickets.length} tickets).`)
