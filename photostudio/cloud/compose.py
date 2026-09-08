from pathlib import Path

CSP = (
    "default-src 'none'; "
    "script-src 'unsafe-inline' https://www.gstatic.com; "
    "style-src 'unsafe-inline'; "
    "img-src data: blob: https://firebasestorage.googleapis.com https://*.firebasestorage.app https://storage.googleapis.com; "
    "connect-src 'self' https://www.gstatic.com https://firebasestorage.googleapis.com https://*.firebasestorage.app https://storage.googleapis.com https://firebase.googleapis.com https://firebaseinstallations.googleapis.com https://www.googleapis.com; "
    "font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"
)

def extend(html, root):
    source = Path(root) / 'cloud'
    def once(before, after):
        nonlocal html
        if before not in html:
            raise RuntimeError('Missing cloud integration anchor: ' + before[:120])
        html = html.replace(before, after, 1)

    once('</style>', (source / 'style.css').read_text() + '</style>')
    once(
        "content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'\"",
        'content="' + CSP + '"'
    )
    once(
        '<button id="saveOrder" class="primary"><svg class="icon"><use href="#i-save"/></svg>Guardar pedido</button></div></section>',
        '<button id="saveOrder" class="primary"><svg class="icon"><use href="#i-save"/></svg>Guardar pedido</button>'
        '<button id="cloudUpload">Subir a la nube</button>'
        '<button id="cloudOpen">Abrir desde la nube</button></div></section>'
    )
    once(
        '<p class="subtle">Configura la prenda y revisa su acabado antes de compartirla.</p></div><div class="actions">',
        '<p class="subtle">Configura la prenda y revisa su acabado antes de compartirla.</p>'
        '<p class="subtle save-message" id="cloudStatus" role="status">Nube: en espera</p></div><div class="actions">'
    )
    once(
        '<span class="save-message" id="saveStatus" role="status">Borrador local</span><span>Funciona sin conexión · v6.0</span></footer>',
        '<span class="save-message" id="saveStatus" role="status">Borrador local</span><span>Borrador local · nube opcional · v6.0</span></footer>'
    )
    once(
        '<p class="help">Pedidos guardados en este navegador</p>',
        '<p class="help">Pedidos guardados en este navegador. Para compartirlos, usa Subir a la nube.</p>'
    )
    once(
        '<dialog id="newDialog"',
        (source / 'chrome.html').read_text() + '<dialog id="newDialog"'
    )
    once(
        "art.image=safeString(a.image,3500000,'imagen');if(art.image){if(!/^data:image\\/png;base64,[A-Za-z0-9+/=]+$/.test(art.image))throw Error('Imagen de pedido inválida.');checkPng(art.image);await getImage(art.image)}",
        "art.image=safeString(a.image,3500000,'imagen');if(art.image){if(typeof isCloudArtRef==='function'&&isCloudArtRef(art.image))await getImage(art.image);else{if(!/^data:image\\/png;base64,[A-Za-z0-9+/=]+$/.test(art.image))throw Error('Imagen de pedido inválida.');checkPng(art.image);await getImage(art.image)}}"
    )
    once(
        "const data=safeString(o.data,7100000,'archivo original'),name=safeString(o.name,150,'archivo original'),type=oneOf(o.type,['png','svg','jpeg'],'tipo de original');await normalizeLogo(data,type);out.original={data,name,type};",
        "const data=safeString(o.data,7100000,'archivo original'),name=safeString(o.name,150,'archivo original'),type=oneOf(o.type,['png','svg','jpeg'],'tipo de original');if(!(typeof isCloudArtRef==='function'&&isCloudArtRef(data)))await normalizeLogo(data,type);out.original={data,name,type};"
    )
    once(
        "const image=safeString(item.image,14000000,'render');if(!/^data:image\\/png;base64,[A-Za-z0-9+/=]+$/.test(image))throw Error('Formato de render inválido.');",
        "const image=safeString(item.image,14000000,'render');if(typeof isCloudArtRef==='function'&&isCloudArtRef(image)){const img=await getImage(image);out.final[view]={image,width:img.naturalWidth,height:img.naturalHeight,signature:safeString(item.signature,16,'versión del render')};continue;}if(!/^data:image\\/png;base64,[A-Za-z0-9+/=]+$/.test(image))throw Error('Formato de render inválido.');"
    )
    once(
        "if(!out.data.startsWith('data:'+mime+';base64,')||!/^[A-Za-z0-9+/=]+$/.test(out.data.split(',')[1]))throw Error('Referencia dañada.');",
        "if(!(typeof isCloudArtRef==='function'&&isCloudArtRef(out.data))&&(!out.data.startsWith('data:'+mime+';base64,')||!/^[A-Za-z0-9+/=]+$/.test(out.data.split(',')[1])))throw Error('Referencia dañada.');"
    )
    once(
        "if(out.extension==='pdf'&&atob(out.data.split(',')[1].slice(0,12)).slice(0,5)!=='%PDF-')throw Error('PDF inválido.');",
        "if(out.extension==='pdf'&&!(typeof isCloudArtRef==='function'&&isCloudArtRef(out.data))&&atob(out.data.split(',')[1].slice(0,12)).slice(0,5)!=='%PDF-')throw Error('PDF inválido.');"
    )
    once(
        "if(['png','jpg','jpeg'].includes(out.extension))await normalizeLogo(out.data,out.extension==='png'?'png':'jpeg');return out}",
        "if(['png','jpg','jpeg'].includes(out.extension)&&!(typeof isCloudArtRef==='function'&&isCloudArtRef(out.data)))await normalizeLogo(out.data,out.extension==='png'?'png':'jpeg');return out}"
    )
    once(
        "init().catch(e=>toast",
        (source / 'firebase-config.js').read_text() + '\n' + (source / 'helpers.js').read_text() + '\n' + (source / 'cloud.js').read_text() + "\ninit().catch(e=>toast"
    )
    return html
