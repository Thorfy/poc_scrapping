// TODO find better way, to avoid window.chrome....
interface Window {
    chrome: any;
}

interface ConfJsonElement {
    host: string; // 'example.com'
    delay: number; // 1000
    pages: {
        pattern: string; // '^https?://(?:www.)?example.com/path/(.*)/([0-9]+).htm(.*)'
        xpaths: {
            price: string;      // '//*[@id="root"]/div/div[3]/div[2]/div[2]/div[1]/div/div[1]'
            type: string;       // '//*[@id="root"]/div/div[3]/div[2]/div[2]/div[1]/div/div[2]'
            location: string;   // '//*[@id="root"]/div/div[3]/div[2]/div[2]/div[1]/div/div[3]'
        }[]
    };
}

type ConfJson = ConfJsonElement[];

const version = '0.0.0';
const extensionId = 'PropertEase';
// TODO get a real server for the project
const host = 'https://therandomcode.net/';
const storage = window.chrome.storage.local;
const confVersion = `${version.split('.')[0]}.${version.split('.')[1]}`;
const storageKeyConfjson = `confjson-${confVersion}`;

function getXpathNodes(expression: string, context = document.body) {
    return document.evaluate(expression, context, null, XPathResult.ANY_TYPE, null);
}

// uncomment & reload extension to reset confjson
// storage.remove([storageKeyConfjson]);


/*window.chrome.storage.local.set({test:'ok'});
setTimeout(() => {
    window.chrome.storage.local.get('test')
        .then(({test:data}:any) => {
            console.log('test storage');
            console.log(data);
        });
    window.chrome.storage.local.remove(['test']);
}, 1E3);
*/
function fetchConfJson(): Promise<ConfJson> {
    return new Promise(res => {
        const v = version.split('.');
        fetch(`${host}rle/getConf/?v=${confVersion}`)
            .then(res => {
                if (!res.ok) {
                    throw 'error fetching conf JSON';
                }
                return res.json();
            })
            .then((data: ConfJson | 'error') => {
                if (data !== 'error') {
                    storage.set({[storageKeyConfjson]: data});
                    res(data);
                }
            })
            .catch(e => {
                console.log(e);
            });
    });
}

function getConfJson(): Promise<ConfJson> {
    return new Promise((res, rej) => {
        storage.get(storageKeyConfjson)
            .then(({[storageKeyConfjson]:data}:any) => {
                if (!data) {
                    fetchConfJson()
                        .then(data => {
                            res(data);
                        })
                        .catch(e => {
                            rej(e);
                        });
                } else {
                    res(data);
                }
            });
    });
}

let currentConf = {};
getConfJson()
    .then(datas => {
        datas.forEach(data => {
            if(new URL(window.location.href).host.endsWith(data.host)) {
                currentConf = data;
            }
        });
        console.log('current conf', currentConf);
    })
    .catch(e => {
        console.log(e);
    });

/*const xPaths = [];
if (/list\.html/.test(new URL(window.location.href).pathname)) {
    console.log('we are on a result page');
    // simulation, fetch json result
    xPaths.push({
        price: '//*[@id="root"]/div/div[3]/div[2]/div[1]/div/div[1]/div[2]/div[2]/div[1]/div/div[1]',
        type: '//*[@id="root"]/div/div[3]/div[2]/div[1]/div/div[1]/div[2]/div[2]/div[2]',
        location: '//*[@id="root"]/div/div[3]/div[2]/div[1]/div/div[1]/div[2]/div[2]/div[4]',
    });
}
xPaths.forEach(xPath => {
    const allPrices = [];
    const allType = [];
    const allLocations = [];
    const prices = getXpathNodes(xPath.price);
    const types = getXpathNodes(xPath.type);
    const locations = getXpathNodes(xPath.location);
    let p, t, l;
    while (p = prices.iterateNext()) {
        allPrices.push(p.textContent);
    }
    while (t = types.iterateNext()) {
        allType.push(t.textContent);
    }
    while (l = locations.iterateNext()) {
        allLocations.push(l.textContent);
    }
    console.log({allPrices, allType, allLocations});
});*/

const style = document.createElement('style');
style.textContent = `
#${extensionId} {
all: initial;
position:fixed;
top:0;
left:0;
height:50px;
}
#${extensionId} img {
all: initial;
height: 100%;
max-width: fit-content;
}
`;
document.body.append(style);

const container = document.createElement('div') as HTMLDivElement;
container.id = extensionId;
document.body.append(container);

const logo = new Image();
logo.src = window.chrome.runtime.getURL('img/icon-48.png');
container.append(logo);

let maxZindex = 0;
document.querySelectorAll('*').forEach(el => {
    const s = getComputedStyle(el);
    const z = parseInt(s.getPropertyValue('z-index'));
    if (z && z > maxZindex) {
        maxZindex = z;
    }
});
container.style.zIndex = `${maxZindex + 1}`;

console.log(window.chrome.i18n.getMessage('jsTestLang'));