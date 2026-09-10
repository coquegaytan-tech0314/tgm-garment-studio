/* Run the established audit with V8's expected schema version without duplicating the full audit file. */
const fs=require('fs'),path=require('path');
const sourcePath=path.join(__dirname,'audit.cjs');
const tempPath=path.join(__dirname,'.audit-v8.generated.cjs');
const original=fs.readFileSync(sourcePath,'utf8');
let source=original;
source=source.replace("assert.equal(run('VERSION'),7)","assert.equal(run('VERSION'),8)");
source=source.replace("invalid JSON fields and v1–v5 migration","invalid JSON fields and v1–v7 migration");
source=source.replace("for(const version of [1,2,3,4,5])","for(const version of [1,2,3,4,5,6,7])");
source=source.replace(/assert\.equal\(out\.version,7\)/g,"assert.equal(out.version,8)");
if(source===original)throw Error('V8 audit patch did not match the established audit.');
fs.writeFileSync(tempPath,source);
process.on('exit',()=>{try{fs.unlinkSync(tempPath)}catch{}});
require(tempPath);
