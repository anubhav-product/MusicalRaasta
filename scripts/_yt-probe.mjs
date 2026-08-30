import puppeteer from 'puppeteer-core'
const B='http://localhost:5188'
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox','--disable-gpu','--hide-scrollbars','--window-size=1440,900','--autoplay-policy=no-user-gesture-required','--mute-audio']})
const p=await b.newPage(); await p.setViewport({width:1440,height:900})
p.on('console',m=>{const t=m.text();if(/yt|player/i.test(t))console.log('  console:',t.slice(0,120))})
await p.goto(`${B}/within-you/nostalgic-classics`,{waitUntil:'networkidle2'})
const s=ms=>new Promise(r=>setTimeout(r,ms)); await s(2200)
await p.evaluate(x=>window.scrollTo(0,(document.body.scrollHeight-innerHeight)*x),0.35); await s(1000)
await p.$$eval('button',bs=>{const x=bs.find(y=>/play full songs$/i.test(y.textContent.trim()));if(x)x.click()})
for (let i=0;i<9;i++){
  await s(1500)
  const st = await p.evaluate(()=>{
    const f=document.querySelector('#yt-stage iframe')
    const label=[...document.querySelectorAll('p')].find(e=>/Full songs/.test(e.textContent))?.textContent
    const time=[...document.querySelectorAll('span')].map(e=>e.textContent).filter(t=>/^\d+:\d\d$/.test(t))
    return {iframe:!!f, label, time:time.join(' / ')}
  })
  console.log(`t+${((i+1)*1.5).toFixed(1)}s`, JSON.stringify(st))
}
await b.close()
