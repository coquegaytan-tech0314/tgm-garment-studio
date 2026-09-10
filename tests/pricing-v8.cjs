/* Run the established pricing suite with V8's migration expectations. */
const fs=require('fs'),path=require('path');
const sourcePath=path.join(__dirname,'pricing.cjs');
const tempPath=path.join(__dirname,'.pricing-v8.generated.cjs');
const original=fs.readFileSync(sourcePath,'utf8');
let source=original;
source=source.replace("for(const version of [1,2,3,4,5,6])","for(const version of [1,2,3,4,5,6,7])");
source=source.replace(/assert\.equal\(migrated\.version,7\)/g,"assert.equal(migrated.version,8)");
source=source.replace('PASS v1–v6 migration and malformed pricing imports','PASS v1–v7 migration and malformed pricing imports');
if(source===original)throw Error('V8 pricing patch did not match the established pricing suite.');
fs.writeFileSync(tempPath,source);
process.on('exit',()=>{try{fs.unlinkSync(tempPath)}catch{}});
require(tempPath);
