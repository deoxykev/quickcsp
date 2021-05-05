const { chromium } = require('playwright');
const { exit } = require('process');
const prompt  = require('prompt');

  // waitfornetworkidle is flaky, use alternative
  // https://gist.github.com/dgozman/d1c46f966eb9854ee1fe24960b603b28
  const DEBUG = true;
  const waitForNetworkSettled =  async (page, action, longPolls = 0) => {
    let networkSettledCallback;
    const networkSettledPromise = new Promise(f => networkSettledCallback = f);

    let requestCounter = 0;
    let actionDone = false;
    const pending = new Set();

    const maybeSettle = () => {
        if (actionDone && requestCounter <= longPolls)
        networkSettledCallback();
    };

    const onRequest = request => {
      if (!request.url().match(/csper\.io/)) {
        ++requestCounter;
        DEBUG && pending.add(request);
        DEBUG && console.log(`+[${requestCounter}]: ${request.url()}`);
      }
    };
    const onRequestDone = request => {
        // Let the page handle responses asynchronously (via setTimeout(0)).
        //
        // Note: this might be changed to use delay, e.g. setTimeout(f, 100),
        // when the page uses delay itself.
        const evaluate = page.evaluate(() => new Promise(f => setTimeout(f, 0)));
        evaluate.catch(e => null).then(() => {
        --requestCounter;
        maybeSettle();
        DEBUG && pending.delete(request);
        DEBUG && console.log(`-[${requestCounter}]: ${request.url()}`);
        });
    };

    page.on('request', onRequest);
    page.on('requestfinished', onRequestDone);
    page.on('requestfailed', onRequestDone);

    let timeoutId;
    DEBUG && (timeoutId = setInterval(() => {
        console.log(`${requestCounter} requests pending:`);
        for (const request of pending) {
          if (!request.url().match(/csper\.io/)) {
            console.log(`  ${request.url()}`);
          }
        }
    }, 5000));

    const result = await action();
    actionDone = true;
    maybeSettle();
    DEBUG && console.log(`action done, ${requestCounter} requests pending`);
    await networkSettledPromise;
    DEBUG && console.log(`action done, network settled`);

    page.removeListener('request', onRequest);
    page.removeListener('requestfinished', onRequestDone);
    page.removeListener('requestfailed', onRequestDone);

    DEBUG && clearTimeout(timeoutId);

    return result;
  };

function sleep(n) { return new Promise(resolve=>setTimeout(resolve,n)); }

  // main
(async () => {
  const pathToExtension = require('path').join(__dirname, 'csper-src');
  const userDataDir = './user-data-dir';
  const browserContext = await chromium.launchPersistentContext(userDataDir,{
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`
    ]
  });

  cspUrl = process.argv.slice(2)[0]

  const page = await browserContext.newPage();
  await page.goto(cspUrl)

  const seenURLs = new Set()

  const crawl = async (url) => {
    if (seenURLs.has(url)) {
      return
    }
    seenURLs.add(url)
    if (!url.startsWith(cspUrl)) {
      return
    }
    
    if (url.endsWith(".pdf") || url.endsWith(".docx") || url.endsWith(".xlsx")) {
        return
    }
    console.log(`Visiting ${url}`)

    const doRequest = waitForNetworkSettled(page, async () => {
        await page.goto(url, { waitutil: 'domcontentloaded' })
        await page.evaluate(() => window.scrollTo(0, (document.body.scrollHeight/3)));
    })

    await Promise.race([
      doRequest, 
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 11.5e3))
    ]).catch(err => {
      console.log(err)
    })

    try {
      const urls = await page.$$eval('a', (elements) =>
          elements.map((el) => el.href),
      )
      for await (const u of urls) {
          await crawl(u)
      }
    } catch {
      console.log(`[-] error scraping: ${url}`)
    }
  }

  console.log("Open up the CSPer extension page on the upper-right. click Start > Start Building Policy. When you are done return to this console window and press enter")
  prompt.start()
  prompt.get(['done'], async (err, result) => { 
    await crawl(cspUrl) 
  }) 

})();
